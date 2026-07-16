// Shared domain types for the Police & Citizen AI Copilot.
// Mirrors the entities described in police-citizen-ai-copilot-prd.md section 5.

export type IncidentType =
  | "theft"
  | "assault"
  | "vandalism"
  | "noise_disturbance"
  | "traffic_incident"
  | "suspicious_activity"
  | "domestic_dispute"
  | "fire_hazard"
  | "other";

export type CaseStatus =
  | "submitted"
  | "processing"
  | "under_review"
  | "dispatch_pending"
  | "dispatch_confirmed"
  | "dispatch_escalated"
  | "dispatch_declined"
  | "closed";

export interface StructuredComplaint {
  incidentType: IncidentType;
  reportedTime: string; // ISO timestamp
  reportedLocationText: string;
  latitude: number;
  longitude: number;
  narrative: string;
  urgency: "low" | "medium" | "high" | "emergency";
  extractionMode: "llm" | "heuristic"; // which path structured this
}

export interface SensorEvent {
  id: string;
  sensorType: "cctv_motion" | "streetlight_fault" | "acoustic" | "traffic_camera";
  incidentTypeHint: IncidentType | "none";
  latitude: number;
  longitude: number;
  timestamp: string; // ISO
  reliability: number; // 0-1, sensor data completeness/confidence
  description: string;
}

export interface CorrelationResult {
  matchedEvents: Array<SensorEvent & { distanceMeters: number; timeGapMinutes: number }>;
  searchRadiusMeters: number;
  searchWindowMinutes: number;
}

export interface DiscrepancyResult {
  confidenceScore: number; // 0-1, confidence that a genuine discrepancy exists
  factors: {
    timeGapScore: number;
    locationGapScore: number;
    typeConsistencyScore: number;
    sensorReliabilityScore: number;
  };
  verdictLabel: "corroborated" | "minor_discrepancy" | "significant_discrepancy" | "insufficient_data";
  explanation: string;
}

export interface CaseRecord {
  id: string;
  citizenId: string;
  status: CaseStatus;
  rawText: string;
  structuredComplaint: StructuredComplaint | null;
  correlation: CorrelationResult | null;
  discrepancy: DiscrepancyResult | null;
  dispatchRequested: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  eventType:
    | "case_submitted"
    | "complaint_structured"
    | "correlation_run"
    | "discrepancy_flagged"
    | "dispatch_requested"
    | "dispatch_confirmed"
    | "dispatch_declined"
    | "dispatch_escalated"
    | "guardrail_input_blocked"
    | "guardrail_output_redacted";
  actorId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface GuardrailInputResult {
  allowed: boolean;
  reason?: string;
  sanitizedText: string;
  mode: "enkrypt" | "mock";
  injectionScore?: number;
}

export interface GuardrailOutputResult {
  redactedPayload: Record<string, unknown>;
  piiEntitiesFound: string[];
  mode: "enkrypt" | "mock";
}
