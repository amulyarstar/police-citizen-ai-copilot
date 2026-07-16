import { nanoid } from "nanoid";
import { BENGALURU_LOCALITIES } from "@/lib/localities";
import type { IncidentType, SensorEvent } from "@/lib/types";

// Simulated municipal sensor telemetry. The PRD is explicit that real sensor
// integration is out of scope for Round 1 (section 7) — this generates a
// plausible, geographically/temporally realistic dataset around the same
// localities citizens pick from, seeded deterministically so a demo is
// reproducible. A handful of hand-placed "golden path" events near the
// current time exist specifically so the bundled example complaints
// (see DEMO_COMPLAINTS below) reliably produce an interesting discrepancy
// result during a live demo instead of a random one.

const SENSOR_TYPES: SensorEvent["sensorType"][] = [
  "cctv_motion",
  "streetlight_fault",
  "acoustic",
  "traffic_camera",
];

const HINT_TYPES: IncidentType[] = [
  "theft",
  "assault",
  "vandalism",
  "noise_disturbance",
  "traffic_incident",
  "suspicious_activity",
];

// Small deterministic PRNG (mulberry32) so the dataset is reproducible across
// runs without needing a persisted seed anywhere.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitterMeters(rand: () => number, maxMeters: number) {
  // ~1 degree latitude ≈ 111,320 meters
  const deg = maxMeters / 111320;
  return (rand() * 2 - 1) * deg;
}

export function generateSensorDataset(nowIso: string = new Date().toISOString()): SensorEvent[] {
  const rand = mulberry32(20260711);
  const now = new Date(nowIso).getTime();
  const events: SensorEvent[] = [];

  // Background dataset: ~140 events over the past 14 days across all localities.
  for (let i = 0; i < 140; i++) {
    const locality = BENGALURU_LOCALITIES[Math.floor(rand() * BENGALURU_LOCALITIES.length)];
    const daysAgo = rand() * 14;
    const timestamp = new Date(now - daysAgo * 86_400_000).toISOString();
    const sensorType = SENSOR_TYPES[Math.floor(rand() * SENSOR_TYPES.length)];
    const hasHint = rand() > 0.35;
    const incidentTypeHint = hasHint ? HINT_TYPES[Math.floor(rand() * HINT_TYPES.length)] : "none";

    events.push({
      id: nanoid(10),
      sensorType,
      incidentTypeHint,
      latitude: locality.latitude + jitterMeters(rand, 450),
      longitude: locality.longitude + jitterMeters(rand, 450),
      timestamp,
      reliability: Math.round((0.55 + rand() * 0.45) * 100) / 100,
      description: describeSensorEvent(sensorType, incidentTypeHint, locality.name),
    });
  }

  // Golden-path events for the bundled demo complaints (see DEMO_COMPLAINTS).
  // Placed close in time/space to "now" so a live demo submission a few
  // minutes from seeding still lands inside the 500m / 3hr correlation window.
  events.push(
    {
      id: "demo-corroborating-1",
      sensorType: "acoustic",
      incidentTypeHint: "noise_disturbance",
      latitude: BENGALURU_LOCALITIES[0].latitude + 0.0008,
      longitude: BENGALURU_LOCALITIES[0].longitude + 0.0006,
      timestamp: new Date(now - 45 * 60_000).toISOString(),
      reliability: 0.92,
      description: "Acoustic sensor recorded sustained loud music, Indiranagar 100 Feet Road",
    },
    {
      id: "demo-discrepancy-1",
      sensorType: "acoustic",
      incidentTypeHint: "domestic_dispute",
      latitude: BENGALURU_LOCALITIES[1].latitude + 0.0004,
      longitude: BENGALURU_LOCALITIES[1].longitude - 0.0003,
      timestamp: new Date(now - 30 * 60_000).toISOString(),
      reliability: 0.88,
      description: "Acoustic sensor recorded raised voices consistent with a dispute, not a theft-in-progress, Koramangala 5th Block",
    }
  );

  return events;
}

function describeSensorEvent(
  sensorType: SensorEvent["sensorType"],
  hint: IncidentType | "none",
  localityName: string
): string {
  const base: Record<SensorEvent["sensorType"], string> = {
    cctv_motion: "CCTV motion sensor recorded activity",
    streetlight_fault: "Streetlight fault/outage logged",
    acoustic: "Acoustic sensor recorded elevated noise levels",
    traffic_camera: "Traffic camera recorded an event",
  };
  const suffix = hint !== "none" ? ` consistent with ${hint.replace("_", " ")}` : " (no specific classification)";
  return `${base[sensorType]}${suffix}, ${localityName}`;
}

// A few ready-to-submit example complaints for demos — deliberately paired
// with the golden-path sensor events above.
export const DEMO_COMPLAINTS: Array<{ label: string; localityId: string; rawText: string }> = [
  {
    label: "Corroborated example (noise complaint)",
    localityId: "indiranagar",
    rawText:
      "There has been loud music from the apartment next door for the last hour, it's a constant disturbance and I can't sleep.",
  },
  {
    label: "Discrepancy example (reported theft, no matching sensor activity)",
    localityId: "koramangala",
    rawText:
      "Someone stole my phone right outside the cafe about 30 minutes ago, they grabbed it from my hand and ran off on a bike.",
  },
  {
    label: "Emergency example (high urgency)",
    localityId: "hsr_layout",
    rawText:
      "There is an active fight happening right now outside my building, someone is being assaulted, please send help immediately, this is an emergency.",
  },
];
