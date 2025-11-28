"use client";
import { exportPng } from "@/lib/download";
import { Download } from "lucide-react";
import { useRef } from "react";

export function ExportButton({ targetId, filename }: { targetId: string; filename: string }) {
  const busy = useRef(false);
  return (
    <button
      onClick={async () => {
        if (busy.current) return;
        busy.current = true;
        const node = document.getElementById(targetId);
        if (!node) return;
        await exportPng(node as HTMLElement, filename);
        busy.current = false;
      }}
      className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
      aria-label="Exportar gráfico a PNG"
    >
      <Download className="size-4" />
      Exportar PNG
    </button>
  );
}
