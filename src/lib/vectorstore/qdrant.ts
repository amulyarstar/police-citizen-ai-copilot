import { QdrantClient } from "@qdrant/js-client-rest";
import type { SensorEvent } from "@/lib/types";
import { embedSpatioTemporal, VECTOR_SIZE } from "@/lib/embeddings";
import type { SpatioTemporalQuery, VectorStore } from "./index";

const COLLECTION = "municipal_sensor_events";

// Real Qdrant-backed store. Uses geo_radius + timestamp range payload filters
// for the actual spatial-temporal correlation (this is a structured filter,
// not semantic similarity — see embeddings.ts for why). The stored vector
// still enables genuine similarity search over historical cases later
// (PRD section 5.5), it's just not what the Round-1 correlation query needs.
export class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;

  constructor(url: string, apiKey?: string) {
    this.client = new QdrantClient({ url, apiKey });
  }

  backend(): "qdrant" {
    return "qdrant";
  }

  async init() {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION);
    if (!exists) {
      await this.client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
    }
  }

  async upsertSensorEvents(events: SensorEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.client.upsert(COLLECTION, {
      wait: true,
      points: events.map((e) => ({
        id: e.id,
        vector: embedSpatioTemporal({
          latitude: e.latitude,
          longitude: e.longitude,
          timestamp: e.timestamp,
          incidentType: e.incidentTypeHint,
          reliability: e.reliability,
        }),
        payload: {
          location: { lon: e.longitude, lat: e.latitude },
          timestamp_ms: new Date(e.timestamp).getTime(),
          sensorType: e.sensorType,
          incidentTypeHint: e.incidentTypeHint,
          reliability: e.reliability,
          description: e.description,
          rawTimestamp: e.timestamp,
        },
      })),
    });
  }

  async querySpatialTemporal(query: SpatioTemporalQuery): Promise<SensorEvent[]> {
    const centerMs = new Date(query.timestamp).getTime();
    const windowMs = query.windowMinutes * 60_000;

    const result = await this.client.scroll(COLLECTION, {
      filter: {
        must: [
          {
            key: "location",
            geo_radius: {
              center: { lon: query.longitude, lat: query.latitude },
              radius: query.radiusMeters,
            },
          },
          {
            key: "timestamp_ms",
            range: { gte: centerMs - windowMs, lte: centerMs + windowMs },
          },
        ],
      },
      limit: 50,
      with_payload: true,
    });

    return result.points.map((p) => {
      const payload = p.payload as any;
      return {
        id: String(p.id),
        sensorType: payload.sensorType,
        incidentTypeHint: payload.incidentTypeHint,
        latitude: payload.location.lat,
        longitude: payload.location.lon,
        timestamp: payload.rawTimestamp,
        reliability: payload.reliability,
        description: payload.description,
      } as SensorEvent;
    });
  }

  async count(): Promise<number> {
    const info = await this.client.count(COLLECTION, {});
    return info.count;
  }
}
