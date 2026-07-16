import type { SensorEvent } from "@/lib/types";

export interface SpatioTemporalQuery {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO — center of the search time window
  radiusMeters: number;
  windowMinutes: number;
}

export interface VectorStore {
  init(): Promise<void>;
  upsertSensorEvents(events: SensorEvent[]): Promise<void>;
  querySpatialTemporal(query: SpatioTemporalQuery): Promise<SensorEvent[]>;
  count(): Promise<number>;
  backend(): "qdrant" | "memory";
}

let _store: VectorStore | null = null;

export async function getVectorStore(): Promise<VectorStore> {
  if (_store) return _store;
  if (process.env.QDRANT_URL) {
    const { QdrantVectorStore } = await import("./qdrant");
    _store = new QdrantVectorStore(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);
  } else {
    const { MemoryVectorStore } = await import("./memory");
    _store = new MemoryVectorStore();
  }
  await _store.init();
  return _store;
}
