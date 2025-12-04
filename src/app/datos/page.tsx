"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ArrowRight } from "lucide-react";
import { JornadaOccupancyChart } from "@/components/JornadaOccupancyChart";
import { StatsCounter } from "@/components/StatsCounter";
import { processMatchData, JornadaData } from "@/utils/processMatchData";
import { getTeamDisplayName } from "@/utils/teamMappings";
import TeamInitialsBadge from "@/components/TeamInitialsBadge";
import TeamCard from "@/components/TeamCard";
import dynamic from "next/dynamic";

type Stadium = {
    stadium_name: string;
    team_primary?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches: number;
    municipality_name?: string;
};

type StadiumPoint = Stadium & { lat: number; lng: number };

const MapComponent = dynamic(
    () => import('@/components/MapComponent'),
    {
        ssr: false,
        loading: () => <div className="h-[500px] w-full flex items-center justify-center text-white/50">Cargando mapa...</div>
    }
);

export default function DashboardPage() {
    const [data, setData] = useState<{ all_stadiums?: Stadium[] } | null>(null);
    const [mapData, setMapData] = useState<StadiumPoint[] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Estado para datos de jornadas y filtros independientes
    const [jornadaData, setJornadaData] = useState<{ primera: JornadaData[], segunda: JornadaData[] }>({ primera: [], segunda: [] });
    const [chartFilter, setChartFilter] = useState<"all" | "primera" | "segunda">("all");
    const [statsFilter, setStatsFilter] = useState<"all" | "primera" | "segunda">("all");

    useEffect(() => {
        fetch("/data/home_metrics.json")
            .then((res) => res.json())
            .then((json) => {
                setData(json);
                // Procesar datos de partidos una vez que tenemos los estadios (para capacidades)
                if (Array.isArray(json?.all_stadiums) && json.all_stadiums.length > 0) {
                    processMatchData(json.all_stadiums)
                        .then(setJornadaData)
                        .catch((err) => {
                            console.error("Error procesando datos de partidos:", err);
                            setJornadaData({ primera: [], segunda: [] });
                        });
                } else {
                    setJornadaData({ primera: [], segunda: [] });
                }
            })
            .catch((err) => {
                console.error("Error loading home_metrics data:", err);
            });

        fetch("/data/stadium_coords.json")
            .then((res) => res.json())
            .then((coords) => {
                setMapData(coords);
            })
            .catch((err) => {
                console.error("Error loading stadium coordinates:", err);
            });
    }, []);

    // Calcular estadísticas totales basadas en el filtro de estadísticas
    const stats = useMemo(() => {
        const relevantData = statsFilter === "all"
            ? [...jornadaData.primera, ...jornadaData.segunda]
            : statsFilter === "primera"
                ? jornadaData.primera
                : jornadaData.segunda;

        const totalAttendance = relevantData.reduce((sum, j) => sum + j.totalAttendance, 0);
        const totalCapacity = relevantData.reduce((sum, j) => sum + j.totalCapacity, 0);
        const avgOccupancy = totalCapacity > 0 ? (totalAttendance / totalCapacity) * 100 : 0;

        return { totalAttendance, avgOccupancy };
    }, [jornadaData, statsFilter]);

    const filteredStadiums = useMemo(() => {
        if (!data) return [];
        const all = data.all_stadiums || [];
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();

        const matches = all.filter(
            (r) =>
                (r.stadium_name || "").toLowerCase().includes(q) ||
                ((r.team_primary || "")).toLowerCase().includes(q) ||
                ((r.municipality_name || "")).toLowerCase().includes(q)
        );

        const teamGroups = new Map<string, Stadium[]>();
        matches.forEach((stadium) => {
            const rawName = stadium.team_primary || "Sin equipo";
            const teamName = getTeamDisplayName(rawName);
            if (!teamGroups.has(teamName)) teamGroups.set(teamName, []);
            teamGroups.get(teamName)!.push(stadium);
        });

        return Array.from(teamGroups.entries()).slice(0, 8).map(([team, stadiums]) => ({ team, stadiums }));
    }, [data, searchQuery]);

    if (!data || !mapData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white/50">Cargando...</div>
            </div>
        );
    }

    const stadiumList = data.all_stadiums || [];

    const teamStats = stadiumList.reduce((acc, stadium) => {
        const team = stadium.team_primary || "Sin equipo";
        if (!acc[team]) {
            acc[team] = { team, avgOccupancy: 0 };
        }
        return acc;
    }, {} as Record<string, { team: string; avgOccupancy: number }>);

    data.all_stadiums.forEach((stadium) => {
        const team = stadium.team_primary || "Sin equipo";
        if (teamStats[team]) {
            teamStats[team].avgOccupancy = stadium.occ_avg_pct;
        }
    });

    let teams = Object.values(teamStats).sort((a, b) => b.avgOccupancy - a.avgOccupancy);
    const previewTeams = teams.slice(0, 8);

    return (
        <div className="min-h-screen bg-black text-white antialiased">
            <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-6 py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white w-fit focus:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Inicio
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-6 py-8 focus:outline-none" tabIndex={-1}>
                {/* 1. Buscador Principal */}
                <div className="mb-8">
                    <div className="relative max-w-md mx-auto">
                        <div className="group relative flex items-center overflow-hidden rounded-full bg-white/5 p-1 shadow-sm ring-1 ring-white/5 backdrop-blur-sm transition-all focus-within:bg-white/10 focus-within:ring-white/20">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-400">
                                <Search className="h-3.5 w-3.5" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar equipo"
                                className="flex-1 bg-transparent px-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                            />
                        </div>
                        {/* Dropdown suggestions */}
                        {filteredStadiums.length > 0 && (
                            <div className="absolute mt-2 left-0 right-0 z-20 w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-2 shadow-2xl backdrop-blur-xl">
                                {filteredStadiums.map(({ team, stadiums }) => (
                                    <TeamCard key={team} team={team} stadiums={stadiums} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Analizar por competición y equipos */}
                <div className="mb-12 relative h-36 flex items-center group/link">
                    <div className="absolute inset-0 z-10 opacity-70 flex items-center left-0 overflow-hidden">
                        <div className="flex space-x-4 px-4">
                            {previewTeams.map((team, index) => (
                                <div
                                    key={index}
                                    className="flex-shrink-0 w-24 h-24 p-3 bg-transparent rounded-xl flex items-center justify-center pointer-events-none transition-opacity"
                                    style={{
                                        opacity: 1 - index * 0.12
                                    }}
                                >
                                    <TeamInitialsBadge
                                        teamName={getTeamDisplayName(team.team)}
                                        size={60}
                                        className="rounded-full"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black to-transparent pointer-events-none z-20"></div>
                    </div>
                    <Link
                        href="/datos/principal"
                        className="relative z-30 ml-auto flex items-center gap-3 md:gap-6 p-3 w-fit focus:outline-none group/link"
                    >
                        <div className="text-right flex flex-col items-end">
                            <h3 className="text-xl md:text-2xl font-bold text-white leading-snug transition-colors">
                                Analizar por competición y equipos
                            </h3>
                        </div>
                        <div className="p-3 bg-cyan-600/50 rounded-full transition-all flex-shrink-0 group-hover/link:bg-cyan-500 group-hover/link:scale-110 group-hover/link:shadow-[0_0_20px_rgba(6,182,212,0.5)] animate-[pulse_3s_ease-in-out_infinite]">
                            <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                    </Link>
                </div>

                {/* 3. Global Filter & Charts Section */}
                <div className="mb-12">
                    {/* Visual Filter Centered - Modern Minimalist */}
                    <div className="flex justify-center mb-10">
                        <div className="flex items-center gap-1 p-1">
                            {(["all", "primera", "segunda"] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => {
                                        setChartFilter(filter);
                                        setStatsFilter(filter);
                                    }}
                                    className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${chartFilter === filter
                                        ? "text-white"
                                        : "text-white/40 hover:text-white/60"
                                        }`}
                                >
                                    {chartFilter === filter && (
                                        <div className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-md border border-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={{ zIndex: -1 }} />
                                    )}
                                    <span className="relative z-10">
                                        {filter === "all" ? "Ambas competiciones" : filter === "primera" ? "Primera División" : "Segunda División"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                        {/* Left Column: Evolution Chart (2/3) - No container styles */}
                        <div className="lg:col-span-2 p-2">
                            <h3 className="text-lg font-bold text-white mb-6 px-2">Evolución de la temporada</h3>
                            <JornadaOccupancyChart
                                data={jornadaData}
                                selectedDivision={chartFilter}
                                onDivisionChange={(f) => {
                                    setChartFilter(f);
                                    setStatsFilter(f);
                                }}
                            />
                        </div>

                        {/* Right Column: Stats Counter (1/3) */}
                        <div className="lg:col-span-1">
                            <StatsCounter
                                totalSpectators={stats.totalAttendance}
                                avgOccupancy={stats.avgOccupancy}
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Los estadios de LaLiga</h2>
                    <MapComponent showStadiumList={false} />
                </div>
            </div >
        </div >
    );
}