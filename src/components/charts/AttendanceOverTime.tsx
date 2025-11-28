"use client";

import { useStore } from "@/store/useStore";
import ChartCard from "../ChartCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AttendanceOverTime() {
  const { computeAll } = useStore();
  const data = computeAll().aggregates.timeseries;

  return (
    <ChartCard title="Evolución temporal (ocupación y asistencia)" id="chart-attendance-time">
      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" unit="%" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Line type="monotone" dataKey="avgOcc" yAxisId="left" dot={false} />
            <Line type="monotone" dataKey="avgAtt" yAxisId="right" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
