"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useMemo } from "react";

export function FiltersPanel() {
  const { data, team, stadium, setTeam, setStadium, setDates } = useStore();

  const teams = useMemo(
    () => Array.from(new Set(data.map((d) => d.home_team))).sort(),
    [data]
  );
  const stadiums = useMemo(
    () => Array.from(new Set(data.map((d) => d.stadium))).sort(),
    [data]
  );

  useEffect(() => {
    // mantener consistencia visual si futuro: persistencia
  }, []);

  return (
    <div className="card p-5 grid md:grid-cols-4 gap-4">
      <div>
        <label className="text-sm text-neutral-500">Equipo local</label>
        <select
          className="mt-2 w-full border rounded-xl px-3 py-2 bg-white dark:bg-neutral-900"
          value={team ?? ""}
          onChange={(e) => setTeam(e.target.value || undefined)}
        >
          <option value="">Todos</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm text-neutral-500">Estadio</label>
        <select
          className="mt-2 w-full border rounded-xl px-3 py-2 bg-white dark:bg-neutral-900"
          value={stadium ?? ""}
          onChange={(e) => setStadium(e.target.value || undefined)}
        >
          <option value="">Todos</option>
          {stadiums.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm text-neutral-500">Desde</label>
        <input
          type="date"
          className="mt-2 w-full border rounded-xl px-3 py-2 bg-white dark:bg-neutral-900"
          onChange={(e) => setDates(e.target.value || undefined, undefined)}
        />
      </div>

      <div>
        <label className="text-sm text-neutral-500">Hasta</label>
        <input
          type="date"
          className="mt-2 w-full border rounded-xl px-3 py-2 bg-white dark:bg-neutral-900"
          onChange={(e) => setDates(undefined, e.target.value || undefined)}
        />
      </div>
    </div>
  );
}
