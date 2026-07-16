import { Pool } from "pg";
import { nanoid } from "nanoid";
import type { AuditLogEntry, CaseRecord } from "@/lib/types";
import type { CreateCaseInput, Repository } from "./index";

export class PostgresRepository implements Repository {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode") ? undefined : { rejectUnauthorized: false },
    });
  }

  backend(): "postgres" {
    return "postgres";
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        citizen_id TEXT NOT NULL,
        status TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        structured_complaint JSONB,
        correlation JSONB,
        discrepancy JSONB,
        dispatch_requested BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      -- Insert-only by convention: this is the immutable legal audit trail (PRD section 5.5).
      -- No application code path issues an UPDATE or DELETE against this table.
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS audit_log_case_id_idx ON audit_log (case_id);
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
    await this.pool.query(
      `INSERT INTO cases (id, citizen_id, status, raw_text, dispatch_requested, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, $5, $6)`,
      [record.id, record.citizenId, record.status, record.rawText, record.createdAt, record.updatedAt]
    );
    return record;
  }

  async updateCase(id: string, patch: Partial<Omit<CaseRecord, "id">>): Promise<CaseRecord> {
    const existing = await this.getCase(id);
    if (!existing) throw new Error(`Case ${id} not found`);
    const merged: CaseRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await this.pool.query(
      `UPDATE cases SET citizen_id=$2, status=$3, raw_text=$4, structured_complaint=$5,
       correlation=$6, discrepancy=$7, dispatch_requested=$8, updated_at=$9 WHERE id=$1`,
      [
        merged.id,
        merged.citizenId,
        merged.status,
        merged.rawText,
        merged.structuredComplaint,
        merged.correlation,
        merged.discrepancy,
        merged.dispatchRequested,
        merged.updatedAt,
      ]
    );
    return merged;
  }

  async getCase(id: string): Promise<CaseRecord | null> {
    const { rows } = await this.pool.query(`SELECT * FROM cases WHERE id = $1`, [id]);
    if (rows.length === 0) return null;
    return rowToCase(rows[0]);
  }

  async listCases(): Promise<CaseRecord[]> {
    const { rows } = await this.pool.query(`SELECT * FROM cases ORDER BY created_at DESC`);
    return rows.map(rowToCase);
  }

  async appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry> {
    const record: AuditLogEntry = { ...entry, id: nanoid(12), createdAt: new Date().toISOString() };
    await this.pool.query(
      `INSERT INTO audit_log (id, case_id, event_type, actor_id, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [record.id, record.caseId, record.eventType, record.actorId, record.payload, record.createdAt]
    );
    return record;
  }

  async listAudit(caseId?: string): Promise<AuditLogEntry[]> {
    const { rows } = caseId
      ? await this.pool.query(`SELECT * FROM audit_log WHERE case_id = $1 ORDER BY created_at DESC`, [caseId])
      : await this.pool.query(`SELECT * FROM audit_log ORDER BY created_at DESC`);
    return rows.map((r) => ({
      id: r.id,
      caseId: r.case_id,
      eventType: r.event_type,
      actorId: r.actor_id,
      payload: r.payload,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
  }
}

function rowToCase(row: any): CaseRecord {
  return {
    id: row.id,
    citizenId: row.citizen_id,
    status: row.status,
    rawText: row.raw_text,
    structuredComplaint: row.structured_complaint,
    correlation: row.correlation,
    discrepancy: row.discrepancy,
    dispatchRequested: row.dispatch_requested,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
