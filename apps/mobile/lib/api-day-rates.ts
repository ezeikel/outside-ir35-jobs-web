import { api } from "@/lib/api";

// Day-rate benchmarks (public). The server already gates these on a minimum
// sample size, so every row here is honest — we just render it.

export type DayRateRow = {
  skill: string;
  skillLabel: string;
  ir35Bucket: "OUTSIDE" | "INSIDE" | "UNKNOWN";
  ir35Label: string;
  tone: "verified" | "muted";
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  sampleSize: number;
};

export type DayRates = {
  rows: DayRateRow[];
  totalSample: number;
  minSample: number;
};

export const fetchDayRates = async (): Promise<DayRates> => {
  const { data } = await api.get<DayRates>("/api/mobile/day-rates");
  return data;
};
