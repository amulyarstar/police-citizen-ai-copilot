import type { SensorEvent } from "@/lib/types";
import { distanceMeters, minutesBetween } from "@/lib/geo";
import type { SpatioTemporalQuery, VectorStore } from "./index";

// Process-lifetime in-memory store. Fine for local dev; for a deployed demo
// prefer Qdrant Cloud (free tier) via QDRANT_URL — see DEPLOY.md. Serverless
// functions may spin up fresh instances per request, which would make this
// fallback appear to "forget" seeded sensors between calls.
const globalStore = globalThis as unknown as { __sensorEvents?: SensorEvent[] };

export class MemoryVectorStore implements VectorStore {
  backend(): "memory" {
    return "memory";
  }

  async init() {
    if (!globalStore.__sensorEvents) {
      globalStore.__sensorEvents = [];
      // Memory store is scoped to this process, so a separately-run `npm run
      // seed` script wouldn't populate the dev server's copy anyway — auto-seed
      // here instead. Qdrant/Postgres-backed deploys use the explicit script.
      const { generateSensorDataset } = await import("@/lib/seedSensors");
      globalStore.__sensorEvents = generateSensorDataset();
    }
  }

  private get events(): SensorEvent[] {
    return globalStore.__sensorEvents!;
  }

  async upsertSensorEvents(events: SensorEvent[]): Promise<void> {
    const byId = new Map(this.events.map((e) => [e.id, e]));
    for (const e of events) byId.set(e.id, e);
    globalStore.__sensorEvents = Array.from(byId.values());
  }

  async querySpatialTemporal(query: SpatioTemporalQuery): Promise<SensorEvent[]> {
    return this.events.filter((e) => {
      const d = distanceMeters(query.latitude, query.longitude, e.latitude, e.longitude);
      const t = minutesBetween(query.timestamp, e.timestamp);
      return d <= query.radiusMeters && t <= query.windowMinutes;
    });
  }

  async count(): Promise<number> {
    return this.events.length;
  }
}
