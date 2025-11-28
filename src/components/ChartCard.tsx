import { ReactNode } from "react";
import { ExportButton } from "./ExportButton";

export default function ChartCard({
  title, id, children
}: { title: string; id: string; children: ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="h3">{title}</h3>
        <ExportButton targetId={id} filename={`asistencia360_${id}.png`} />
      </div>
      <div id={id} className="p-2 bg-white dark:bg-neutral-900 rounded-xl">
        {children}
      </div>
    </div>
  );
}
