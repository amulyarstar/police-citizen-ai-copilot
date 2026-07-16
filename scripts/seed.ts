import { getVectorStore } from "../src/lib/vectorstore";
import { generateSensorDataset } from "../src/lib/seedSensors";

async function main() {
  const store = await getVectorStore();
  const events = generateSensorDataset();
  await store.upsertSensorEvents(events);
  const count = await store.count();
  console.log(`[seed] Backend: ${store.backend()}`);
  console.log(`[seed] Upserted ${events.length} simulated sensor events. Store now has ${count} total.`);
  if (store.backend() === "memory") {
    console.log(
      "[seed] NOTE: in-memory backend is process-scoped — running this script won't affect a separately-running `npm run dev` process. Either set QDRANT_URL, or seed happens automatically on first API call in dev (see README)."
    );
  }
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
