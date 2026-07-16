import Database from "better-sqlite3";
import path from "path";
import { nanoid } from "nanoid";
import type { AuditLogEntry, CaseRecord } from "@/lib/types";
import type { CreateCaseInput, Repository } from "./index";

// Local-only fallback store. Good for `npm run dev` with zero setup.
// NOT suitable for a serverless production deploy (Vercel functions don't
// guarantee a persistent filesystem across invocations) — see DEPLOY.md.
// Set DATABASE_URL to a real Postgres instance for anything you demo live.

const DB_PATH = path.join(process.cwd(), ".data", "local.db");

export class SqliteRepository implements Repository {
  private db: Database.Database;

  constructor() {
    const fs = require("fs") as typeof import("fs");
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
  }

  backend(): "sqlite" {
    return "sqlite";
  }

  async init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        citizen_id TEXT NOT NULL,
        status TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        structured_complaint TEXT,
        correlation TEXT,
        discrepancy TEXT,
        dispatch_requested INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  async createCase(input: CreateCaseInput): Promise<CaseRecord> {
    const now = new Date().toISOString();
    const record: CaseRecord = {
      id: nanoid(12),
      citizenId: input.citizenId,
      status: "submitted",
      rawText: input.rawText,
      structuredComplaint: null,
      correlation: null,
      discrepancy: null,
      dispatchRequested: false,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        `INSERT INTO cases (id, citizen_id, status, raw_text, structured_complaint, correlation, discrepancy, dispatch_requested, created_at, updated_at)
         VALUES (@id, @citizenId, @status, @rawText, NULL, NULL, NULL, 0, @createdAt, @updatedAt)`
      )
      .run(record);
    return record;
  }

  async updateCase(id: string, patch: Partial<Omit<CaseRecord, "id">>): Promise<CaseRecord> {
    const existing = await this.getCase(id);
    if (!existing) throw new Error(`Case ${id} not found`);
    const merged: CaseRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.db
      .prepare(
        `UPDATE cases SET citizen_id=@citizenId, status=@status, raw_text=@rawText,
         structured_complaint=@structuredComplaint, correlation=@correlation, discrepancy=@discrepancy,
         dispatch_requested=@dispatchRequested, updated_at=@updatedAt WHERE id=@id`
      )
      .run({
        id: merged.id,
        citizenId: merged.citizenId,
        status: merged.status,
        rawText: merged.rawText,
        structuredComplaint: merged.structuredComplaint ? JSON.stringify(merged.structuredComplaint) : null,
        correlation: merged.correlation ? JSON.stringify(merged.correlation) : null,
        discrepancy: merged.discrepancy ? JSON.stringify(merged.discrepancy) : null,
        dispatchRequested: merged.dispatchRequested ? 1 : 0,
        updatedAt: merged.updatedAt,
      });
    return merged;
  }

  async getCase(id: string): Promise<CaseRecord | null> {
    const row = this.db.prepare(`SELECT * FROM cases WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return rowToCase(row);
  }

  async listCases(): Promise<CaseRecord[]> {
    const rows = this.db.prepare(`SELECT * FROM cases ORDER BY created_at DESC`).all() as any[];
    return rows.map(rowToCase);
  }

  async appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry> {
    const record: AuditLogEntry = {
      ...entry,
      id: nanoid(12),
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `INSERT INTO audit_log (id, case_id, event_type, actor_id, payload, created_at)
         VALUES (@id, @caseId, @eventType, @actorId, @payload, @createdAt)`
      )
      .run({
        id: record.id,
        caseId: record.caseId,
        eventType: record.eventType,
        actorId: record.actorId,
        payload: JSON.stringify(record.payload),
        createdAt: record.createdAt,
      });
    return record;
  }

  async listAudit(caseId?: string): Promise<AuditLogEntry[]> {
    const rows = caseId
      ? (this.db.prepare(`SELECT * FROM audit_log WHERE case_id = ? ORDER BY created_at DESC`).all(caseId) as any[])
      : (this.db.prepare(`SELECT * FROM audit_log ORDER BY created_at DESC`).all() as any[]);
    return rows.map((r) => ({
      id: r.id,
      caseId: r.case_id,
      eventType: r.event_type,
      actorId: r.actor_id,
      payload: JSON.parse(r.payload),
      createdAt: r.created_at,
    }));
  }
}

function rowToCase(row: any): CaseRecord {
  return {
    id: row.id,
    citizenId: row.citizen_id,
    status: row.status,
    rawText: row.raw_text,
    structuredComplaint: row.structured_complaint ? JSON.parse(row.structured_complaint) : null,
    correlation: row.correlation ? JSON.parse(row.correlation) : null,
    discrepancy: row.discrepancy ? JSON.parse(row.discrepancy) : null,
    dispatchRequested: !!row.dispatch_requested,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
