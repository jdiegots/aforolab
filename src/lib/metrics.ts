import type { Row } from "./csv";
import { parseISO, format, getDay } from "date-fns";

export type Kpis = {
  avgOccupancy: number;
  avgAttendance: number;
  stadiums: number;
};

export type Aggregates = {
  byStadium: { stadium: string; games: number; avgOcc: number; avgAtt: number }[];
  timeseries: { date: string; avgOcc: number; avgAtt: number }[];
  byWeekHour: { weekday: number; hourBucket: string; avgOcc: number }[];
};

function occ(att: number, cap: number) {
  const pct = (att / Math.max(1, cap)) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function compute(rows: Row[]) {
  const k: Kpis = { avgOccupancy: 0, avgAttendance: 0, stadiums: 0 };

  const byStadiumMap = new Map<string, { sumOcc: number; sumAtt: number; n: number }>();
  const byDateMap = new Map<string, { sumOcc: number; sumAtt: number; n: number }>();
  const byWeekHourMap = new Map<string, { weekday: number; hourBucket: string; sumOcc: number; n: number }>();

  const seenStadiums = new Set<string>();

  rows.forEach((r) => {
    const o = occ(r.attendance, r.capacity);
    // kpis
    k.avgOccupancy += o;
    k.avgAttendance += r.attendance;
    seenStadiums.add(r.stadium);

    // stadium
    const st = byStadiumMap.get(r.stadium) ?? { sumOcc: 0, sumAtt: 0, n: 0 };
    st.sumOcc += o; st.sumAtt += r.attendance; st.n += 1;
    byStadiumMap.set(r.stadium, st);

    // date
    const d = r.date;
    const dt = byDateMap.get(d) ?? { sumOcc: 0, sumAtt: 0, n: 0 };
    dt.sumOcc += o; dt.sumAtt += r.attendance; dt.n += 1;
    byDateMap.set(d, dt);

    // weekday/hour bucket
    const weekday = getDay(parseISO(r.date)); // 0-6
    let bucket = "19-21";
    if (r.kickoff_time) {
      const [hh] = r.kickoff_time.split(":").map(Number);
      if (hh < 16) bucket = "12-15";
      else if (hh < 19) bucket = "16-18";
      else if (hh < 22) bucket = "19-21";
      else bucket = "22+";
    }
    const key = `${weekday}-${bucket}`;
    const wh = byWeekHourMap.get(key) ?? { weekday, hourBucket: bucket, sumOcc: 0, n: 0 };
    wh.sumOcc += o; wh.n += 1;
    byWeekHourMap.set(key, wh);
  });

  const n = rows.length || 1;
  k.avgOccupancy = k.avgOccupancy / n;
  k.avgAttendance = k.avgAttendance / n;
  k.stadiums = seenStadiums.size;

  const byStadium = Array.from(byStadiumMap, ([stadium, v]) => ({
    stadium,
    games: v.n,
    avgOcc: v.sumOcc / v.n,
    avgAtt: v.sumAtt / v.n
  })).sort((a, b) => b.avgOcc - a.avgOcc);

  const timeseries = Array.from(byDateMap, ([date, v]) => ({
    date,
    avgOcc: v.sumOcc / v.n,
    avgAtt: v.sumAtt / v.n
  })).sort((a, b) => a.date.localeCompare(b.date));

  const byWeekHour = Array.from(byWeekHourMap, ([, v]) => ({
    weekday: v.weekday,
    hourBucket: v.hourBucket,
    avgOcc: v.sumOcc / v.n
  })).sort((a, b) => a.weekday - b.weekday || a.hourBucket.localeCompare(b.hourBucket));

  const aggregates: Aggregates = { byStadium, timeseries, byWeekHour };
  return { kpis: k, aggregates };
}
