// Round 1 simplification: citizens pick a known locality instead of free-text
// geocoding, which would need a separate geocoding API/key. Sensor seed data
// (scripts/seed.ts) is generated around these same points, so demo complaints
// reliably land near real seeded sensor activity. Swapping in a real
// geocoder later is a drop-in replacement — see PITCH_NOTES.md.
export interface Locality {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const BENGALURU_LOCALITIES: Locality[] = [
  { id: "indiranagar", name: "Indiranagar, 100 Feet Road", latitude: 12.9716, longitude: 77.6412 },
  { id: "koramangala", name: "Koramangala, 5th Block", latitude: 12.9352, longitude: 77.6245 },
  { id: "mg_road", name: "MG Road", latitude: 12.9756, longitude: 77.6068 },
  { id: "jayanagar", name: "Jayanagar, 4th Block", latitude: 12.9308, longitude: 77.5838 },
  { id: "whitefield", name: "Whitefield, ITPL Main Road", latitude: 12.9698, longitude: 77.7500 },
  { id: "hsr_layout", name: "HSR Layout, Sector 2", latitude: 12.9121, longitude: 77.6446 },
  { id: "malleswaram", name: "Malleswaram, 8th Cross", latitude: 13.0027, longitude: 77.5697 },
  { id: "electronic_city", name: "Electronic City Phase 1", latitude: 12.8452, longitude: 77.6602 },
];

export function localityById(id: string): Locality | undefined {
  return BENGALURU_LOCALITIES.find((l) => l.id === id);
}
