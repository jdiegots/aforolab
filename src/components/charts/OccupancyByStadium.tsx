"use client";

import { useStore } from "@/store/useStore";
import ChartCard from "../ChartCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function OccupancyByStadium() {
  const { computeAll } = useStore();
  const data = computeAll().aggregates.byStadium.slice(0, 20); // top 20

  return (
    <ChartCard title="Ocupación media por estadio (Top 20)" id="chart-occupancy-stadium">
      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
            <XAxis dataKey="stadium" angle={-20} textAnchor="end" height={60} interval={0} />
            <YAxis unit="%" />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Bar dataKey="avgOcc" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
