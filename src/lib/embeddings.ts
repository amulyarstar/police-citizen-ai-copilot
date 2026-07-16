import type { IncidentType } from "@/lib/types";

// Deterministic, dependency-free feature vector for a spatio-temporal event.
// This intentionally avoids calling an external embeddings API: the Spatial-
// Temporal Log Correlation tool's real job is geo+time filtering (which Qdrant
// does natively via geo_radius/range payload filters — see vectorstore/qdrant.ts).
// This vector rides along on each point so the same collection can *also*
// support "find similar historical cases" similarity search later, without
// needing a separate embeddings provider/key.
//
// Dimensions: [latNorm, lonNorm, hourSin, hourCos, daySin, daySin, typeSlot, reliability]
export const VECTOR_SIZE = 8;

const INCIDENT_TYPES: IncidentType[] = [
  "theft",
  "assault",
  "vandalism",
  "noise_disturbance",
  "traffic_incident",
  "suspicious_activity",
  "domestic_dispute",
  "fire_hazard",
  "other",
];

export function embedSpatioTemporal(params: {
  latitude: number;
  longitude: number;
  timestamp: string;
  incidentType: IncidentType | "none";
  reliability: number;
}): number[] {
  const date = new Date(params.timestamp);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const day = date.getUTCDay();
  const typeIndex = params.incidentType === "none" ? 0 : INCIDENT_TYPES.indexOf(params.incidentType) + 1;

  return [
    params.latitude / 90,
    params.longitude / 180,
    Math.sin((2 * Math.PI * hour) / 24),
    Math.cos((2 * Math.PI * hour) / 24),
    Math.sin((2 * Math.PI * day) / 7),
    Math.cos((2 * Math.PI * day) / 7),
    typeIndex / (INCIDENT_TYPES.length + 1),
    params.reliability,
  ];
}
