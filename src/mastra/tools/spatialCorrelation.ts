import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getVectorStore } from "@/lib/vectorstore";
import { distanceMeters, minutesBetween } from "@/lib/geo";

const SEARCH_RADIUS_METERS = 500; // PRD 5.4: "within a 500m radius"
const SEARCH_WINDOW_MINUTES = 180; // +/- 3 hours around the reported time

export const spatialCorrelationTool = createTool({
  id: "spatial-temporal-correlation",
  description:
    "Queries municipal sensor logs within a 500m radius and matching time window of a reported incident.",
  inputSchema: z.object({
    latitude: z.number(),
    longitude: z.number(),
    reportedTime: z.string(),
  }),
  outputSchema: z.object({
    matchedEvents: z.array(
      z.object({
        id: z.string(),
        sensorType: z.string(),
        incidentTypeHint: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        timestamp: z.string(),
        reliability: z.number(),
        description: z.string(),
        distanceMeters: z.number(),
        timeGapMinutes: z.number(),
      })
    ),
    searchRadiusMeters: z.number(),
    searchWindowMinutes: z.number(),
  }),
  execute: async (inputData) => {
    const { latitude, longitude, reportedTime } = inputData;
    const store = await getVectorStore();
    const events = await store.querySpatialTemporal({
      latitude,
      longitude,
      timestamp: reportedTime,
      radiusMeters: SEARCH_RADIUS_METERS,
      windowMinutes: SEARCH_WINDOW_MINUTES,
    });

    const matchedEvents = events.map((e) => ({
      ...e,
      distanceMeters: Math.round(distanceMeters(latitude, longitude, e.latitude, e.longitude)),
      timeGapMinutes: Math.round(minutesBetween(reportedTime, e.timestamp)),
    }));

    return {
      matchedEvents,
      searchRadiusMeters: SEARCH_RADIUS_METERS,
      searchWindowMinutes: SEARCH_WINDOW_MINUTES,
    };
  },
});
