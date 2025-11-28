"use client";

import { useStore } from "@/store/useStore";
import ChartCard from "../ChartCard";

const days = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const buckets = ["12-15","16-18","19-21","22+"];

export default function WeekdayHourHeat() {
  const { computeAll } = useStore();
  const agg = computeAll().aggregates.byWeekHour;

  // construir matriz
  const grid: Record<string, number> = {};
  agg.forEach((x) => { grid[`${x.weekday}-${x.hourBucket}`] = x.avgOcc; });

  return (
    <ChartCard title="Ocupación media por día y franja horario" id="chart-weekhour-heat">
      <div className="grid grid-cols-5 gap-2">
        <div />
        {buckets.map((b) => <div key={b} className="text-sm text-neutral-500 text-center">{b}</div>)}
        {days.map((d, i) => (
          <>
            <div key={`d-${d}`} className="text-sm text-neutral-500">{d}</div>
            {buckets.map((b) => {
              const v = grid[`${i}-${b}`] ?? 0;
              const bg = `hsl(200, 80%, ${100 - Math.min(95, v)}%)`;
              return (
                <div
                  key={`${i}-${b}`}
                  className="h-10 rounded-xl border"
                  style={{ background: bg }}
                  title={`${d} ${b}: ${v.toFixed(1)}%`}
                />
              );
            })}
          </>
        ))}
      </div>
    </ChartCard>
  );
}
