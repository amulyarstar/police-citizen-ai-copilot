import type { AuditLogEntry, CaseRecord, CaseStatus } from "@/lib/types";

export interface CreateCaseInput {
  citizenId: string;
  rawText: string;
}

export interface Repository {
  init(): Promise<void>;
  createCase(input: CreateCaseInput): Promise<CaseRecord>;
  updateCase(id: string, patch: Partial<Omit<CaseRecord, "id">>): Promise<CaseRecord>;
  getCase(id: string): Promise<CaseRecord | null>;
  listCases(): Promise<CaseRecord[]>;
  appendAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry>;
  listAudit(caseId?: string): Promise<AuditLogEntry[]>;
  /** Which backend is actually active — surfaced in the UI so a demo audience always
   * knows whether they're looking at the durable Postgres store or the local dev fallback. */
  backend(): "postgres" | "sqlite";
}

let _repo: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (_repo) return _repo;

  if (process.env.DATABASE_URL) {
    const { PostgresRepository } = await import("./postgres");
    _repo = new PostgresRepository(process.env.DATABASE_URL);
  } else {
    const { SqliteRepository } = await import("./sqlite");
    _repo = new SqliteRepository();
  }
  await _repo.init();
  return _repo;
}

export function newCaseStatus(): CaseStatus {
  return "submitted";
}
