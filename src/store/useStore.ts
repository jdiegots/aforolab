import { create } from "zustand";
import type { Row } from "@/lib/csv";
import { compute } from "@/lib/metrics";

type State = {
  data: Row[];
  competition: string;
  team?: string;
  stadium?: string;
  dateFrom?: string;
  dateTo?: string;
  theme: "light" | "dark";
  setData: (rows: Row[]) => void;
  setCompetition: (c: string) => void;
  setTeam: (t?: string) => void;
  setStadium: (s?: string) => void;
  setDates: (f?: string, t?: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  computeAll: () => ReturnType<typeof compute>;
  filtered: () => Row[];
};

export const useStore = create<State>((set, get) => ({
  data: [],
  competition: "LaLiga 23/24",
  theme: "light",
  setData: (rows) => set({ data: rows }),
  setCompetition: (c) => set({ competition: c }),
  setTeam: (team) => set({ team }),
  setStadium: (stadium) => set({ stadium }),
  setDates: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
  setTheme: (theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    set({ theme });
  },
  filtered: () => {
    const { data, team, stadium, dateFrom, dateTo } = get();
    return data.filter((r) => {
      const okTeam = team ? r.home_team === team : true;
      const okStadium = stadium ? r.stadium === stadium : true;
      const okFrom = dateFrom ? r.date >= dateFrom : true;
      const okTo = dateTo ? r.date <= dateTo : true;
      return okTeam && okStadium && okFrom && okTo;
    });
  },
  computeAll: () => compute(get().filtered())
}));
