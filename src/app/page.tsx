"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import TeamCard from "@/components/TeamCard";
import { motion, useScroll, useTransform } from "framer-motion";
import { BeeswarmChart } from "@/components/BeeswarmChart";

type RankRow = {
  stadium_id?: string;
  stadium_name: string;
  team_primary?: string;
  team_sec?: string;
  capacity: number;
  municipality_name: string;
  province_name: string;
  ccaa_name: string;
  matches: number;
  att_total: number;
  att_avg: number;
  occ_avg_pct: number;
  metric?: number;
};

type HomeMetrics = {
  generated_at: string;
  all_stadiums: RankRow[];
  top_avg_attendance: RankRow[];
  top_occ_pct: RankRow[];
};

export default function HomePage() {
  const [data, setData] = useState<HomeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const { scrollYProgress } = useScroll();

  // Title zoom out and fade
  const titleScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.5]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Graph blur removal
  const graphBlurValue = useTransform(scrollYProgress, [0, 0.3], [10, 0]);
  const graphBlur = useTransform(graphBlurValue, (value) => `blur(${value}px)`);

  // Controls fade in (appear after title fades out)
  const controlsOpacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);

  useEffect(() => {
    let mounted = true;
    fetch("/data/home_metrics.json")
      .then((res) => res.json())
      .then((json: HomeMetrics) => {
        if (!mounted) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredStadiums = useMemo(() => {
    if (!data) return [];
    const all = data.all_stadiums || [];
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    // Filter stadiums that match the query
    const matches = all.filter(
      (r) =>
        r.stadium_name.toLowerCase().includes(q) ||
        (r.team_primary ?? "").toLowerCase().includes(q) ||
        (r.team_sec ?? "").toLowerCase().includes(q) ||
        (r.municipality_name ?? "").toLowerCase().includes(q)
    );

    // Group by team (primary or secondary)
    const teamGroups = new Map<string, RankRow[]>();

    matches.forEach((stadium) => {
      const teamName = stadium.team_primary || stadium.team_sec || "Sin equipo";
      if (!teamGroups.has(teamName)) {
        teamGroups.set(teamName, []);
      }
      teamGroups.get(teamName)!.push(stadium);
    });

    // Convert to array and limit to 5 teams
    return Array.from(teamGroups.entries())
      .slice(0, 5)
      .map(([team, stadiums]) => ({ team, stadiums }));
  }, [data, query]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 -mt-24 md:-mt-32 overflow-x-hidden">

      {/* Graph Background - Always visible, blur controlled by scroll */}
      <div className="fixed inset-0 z-0 flex items-center justify-center">
        {!loading && data?.all_stadiums && (
          <motion.div
            style={{
              filter: graphBlur
            }}
            className="w-full h-full flex items-center justify-center"
          >
            <BeeswarmChart data={data.all_stadiums} />
          </motion.div>
        )}
      </div>

      {/* Title Overlay - Zooms out and fades */}
      <motion.div
        style={{
          scale: titleScale,
          opacity: titleOpacity
        }}
        className="fixed inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="text-center px-4">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight text-white drop-shadow-2xl">
            La asistencia a los <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              estadios de LaLiga
            </span>
          </h1>
        </div>

        {/* Simple animated scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{
            opacity: { duration: 1, delay: 0.5 },
            y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute bottom-12"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/40"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Chart Description - Appears when title fades */}
      <motion.div
        style={{
          opacity: controlsOpacity
        }}
        className="fixed top-8 left-8 z-20 max-w-xs pointer-events-none"
      >
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-white/90">
            Ocupación de estadios
          </h2>
          <p className="text-xs text-white/50 leading-relaxed">
            Cada punto representa un estadio. La posición vertical indica el porcentaje de ocupación promedio,
            mientras que el tamaño refleja su capacidad total.
          </p>
        </div>
      </motion.div>

      {/* Bottom Controls - Appear after scroll */}
      <motion.div
        style={{
          opacity: controlsOpacity
        }}
        className="fixed bottom-0 left-0 right-0 z-30 pb-8 px-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-20 pointer-events-none"
      >
        <div className="w-full max-w-sm mx-auto space-y-4 pointer-events-auto">
          {/* Search */}
          <div className="relative">
            <div className="group relative flex items-center overflow-hidden rounded-full bg-white/5 p-1 shadow-sm ring-1 ring-white/5 backdrop-blur-sm transition-all focus-within:bg-white/10 focus-within:ring-white/20">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar equipo"
                className="flex-1 bg-transparent px-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            {/* Dropdown */}
            {filteredStadiums.length > 0 && (
              <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-2 shadow-2xl backdrop-blur-xl">
                {filteredStadiums.map(({ team, stadiums }) => (
                  <TeamCard key={team} team={team} stadiums={stadiums} />
                ))}
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex items-center justify-center">
            <Link
              href="/datos"
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 animate-subtle-gradient px-8 py-3 text-sm font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105 active:scale-95"
            >
              Explorar datos
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Invisible scroll trigger */}
      <div className="h-[200vh]" />
    </div>
  );
}
