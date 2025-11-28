import Papa from "papaparse";
import { parseISO, isValid } from "date-fns";

export type Row = {
  date: string;
  home_team: string;
  away_team?: string;
  competition: string;
  stadium: string;
  capacity: number;
  attendance: number;
  city?: string;
  country?: string;
  kickoff_time?: string;
  tv_broadcast?: string;
  weather_temp_c?: number;
  precipitation_mm?: number;
};

function toNumberSafe(x: any): number {
  if (x === null || x === undefined) return NaN;
  const s = String(x).replace(/\./g, "").replace(/,/g, ".");
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

function normalizeDate(s: string) {
  const iso = parseISO(s);
  if (isValid(iso)) return iso.toISOString().slice(0, 10);
  // fallback: dd/MM/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = `${m[3]}-${m[2]}-${m[1]}`;
    return d;
  }
  return s;
}

export async function loadCsvPreset(path: string): Promise<Row[]> {
  const res = await fetch(path);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows: Row[] = (parsed.data as any[]).map((r) => ({
    date: normalizeDate(r.date),
    home_team: r.home_team,
    away_team: r.away_team,
    competition: r.competition,
    stadium: r.stadium,
    capacity: toNumberSafe(r.capacity),
    attendance: toNumberSafe(r.attendance),
    city: r.city,
    country: r.country,
    kickoff_time: r.kickoff_time,
    tv_broadcast: r.tv_broadcast,
    weather_temp_c: toNumberSafe(r.weather_temp_c),
    precipitation_mm: toNumberSafe(r.precipitation_mm)
  }));
  return rows.filter((r) => r.date && r.home_team && r.stadium && r.capacity && r.attendance);
}
