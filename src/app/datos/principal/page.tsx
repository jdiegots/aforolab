"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ChevronDown } from "lucide-react";
import { processMatchData, MatchData } from "@/utils/processMatchData";
import { buildMatchDateTime, formatAdjustedTime, formatAdjustedDate } from '@/utils/timeHelpers';
import { getTeamSlug, getTeamDisplayName } from "@/utils/teamMappings";
import TeamLogo from "@/components/TeamLogo";
import TeamInitialsBadge from "@/components/TeamInitialsBadge";
// import CompetitionLogo from "@/components/CompetitionLogo"; // Removed as requested
import { formatNumber } from "@/utils/formatNumber";

const MatchCard = ({ match, formatDate, formatTime }: { match: MatchData, formatDate: (m: MatchData) => string, formatTime: (m: MatchData) => string }) => (
    <div
        className="bg-white/5 border border-white/5 rounded-lg p-3 hover:bg-white/10 transition-all"
    >
        {/* Header: Date and Jornada */}
        <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-mono">
                    {match.localDate || formatDate(match)}
                </span>
                <span className="text-[10px] text-white/30">
                    {match.localTime || formatTime(match)}
                </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${match.division === "Primera División"
                ? "bg-red-500/10 text-red-400"
                : "bg-cyan-500/10 text-cyan-400"
                }`}>
                J{match.spieltag}
            </span>
        </div>

        {/* Match Result */}
        <div className="flex items-center justify-between mb-3">
            <div className="flex-1 text-right text-xs font-medium text-white/90 truncate pr-2">
                {match.home_team}
            </div>
            <div className="px-2 py-0.5 bg-black/40 rounded text-xs font-mono font-bold text-white border border-white/5">
                {match.home_goals} - {match.away_goals}
            </div>
            <div className="flex-1 text-left text-xs font-medium text-white/90 truncate pl-2">
                {match.away_team}
            </div>
        </div>

        {/* Attendance Info & Progress Bar */}
        {match.occupancyPct !== undefined && match.occupancyPct > 0 ? (
            <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-white/50">
                        {formatNumber(match.attendance || 0)} esp.
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${match.occupancyPct > 80 ? "text-green-400" :
                        match.occupancyPct > 60 ? "text-cyan-400" : "text-amber-400"
                        }`}>
                        {match.occupancyPct.toFixed(0)}%
                    </span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${match.occupancyPct > 80 ? "bg-green-500" :
                            match.occupancyPct > 60 ? "bg-cyan-500" : "bg-amber-500"
                            }`}
                        style={{ width: `${Math.min(match.occupancyPct, 100)}%` }}
                    />
                </div>
            </div>
        ) : (
            <div className="pt-2 border-t border-white/5 text-[10px] text-white/30 text-center italic">
                Sin datos de asistencia
            </div>
        )}
    </div>
);

type Stadium = {
    stadium_name: string;
    team_primary?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches: number;
    municipality_name?: string;
};

type TeamData = {
    name: string;
    division: string;
    avgOccupancy: number;
    stadiumCount: number;
};

export default function AllTeamsPage() {
    const [stadiums, setStadiums] = useState<Stadium[]>([]);
    const [matches, setMatches] = useState<MatchData[]>([]);
    const [teamFilter, setTeamFilter] = useState<"all" | "primera" | "segunda">("all");
    const [matchDivisionFilter, setMatchDivisionFilter] = useState<"all" | "primera" | "segunda">("all");
    const [matchViewMode, setMatchViewMode] = useState<"list" | "jornada">("list");
    const [selectedJornada, setSelectedJornada] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const stadiumsRes = await fetch("/data/stadium_full_data.json");
                const stadiumsData = await stadiumsRes.json();
                setStadiums(stadiumsData);

                // Process matches with stadium data
                const processedData = await processMatchData(stadiumsData);
                setMatches(processedData.allMatches || []);

                // Set default jornada to latest (optional, but we default to "list" view now)
                if (processedData.allMatches && processedData.allMatches.length > 0) {
                    const latestJornada = Math.max(...processedData.allMatches.map((m: MatchData) => m.spieltag));
                    setSelectedJornada(latestJornada);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Mapear equipos a divisiones
    const teamDivisions = useMemo(() => {
        const map = new Map<string, string>();
        matches.forEach(m => {
            if (!map.has(m.home_team)) {
                map.set(m.home_team, m.division);
            }
        });
        return map;
    }, [matches]);

    // Agrupar equipos únicos
    const teamData = useMemo(() => {
        const teamMap = new Map<string, TeamData>();

        stadiums.forEach(stadium => {
            const rawName = stadium.team_primary || "Sin equipo";
            const teamName = getTeamDisplayName(rawName);
            const division = teamDivisions.get(teamName) || "";

            if (teamMap.has(teamName)) {
                const existing = teamMap.get(teamName)!;
                existing.avgOccupancy = (existing.avgOccupancy * existing.stadiumCount + stadium.occ_avg_pct) / (existing.stadiumCount + 1);
                existing.stadiumCount += 1;
            } else {
                teamMap.set(teamName, {
                    name: teamName,
                    division,
                    avgOccupancy: stadium.occ_avg_pct,
                    stadiumCount: 1
                });
            }
        });

        return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [stadiums, teamDivisions]);

    // Filtrar equipos (solo afectado por teamFilter)
    const filteredTeams = useMemo(() => {
        let teams = teamData;

        // Apply division filter
        if (teamFilter === "primera") {
            teams = teams.filter((t) => t.division === "Primera División");
        } else if (teamFilter === "segunda") {
            teams = teams.filter((t) => t.division === "Segunda División");
        }

        // Apply search filter
        if (searchQuery.trim()) {
            teams = teams.filter((t) =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return teams;
    }, [teamData, teamFilter, searchQuery]);

    // Get available jornadas
    const availableJornadas = useMemo(() => {
        const jornadas = Array.from(new Set(matches.map(m => m.spieltag))).sort((a, b) => b - a);
        return jornadas;
    }, [matches]);

    // Filtrar partidos (afectado por matchDivisionFilter y selectedJornada)
    const filteredMatches = useMemo(() => {
        let filtered = matches;

        // Apply division filter
        if (matchDivisionFilter !== "all") {
            const targetDiv = matchDivisionFilter === "primera" ? "Primera División" : "Segunda División";
            filtered = filtered.filter(m => m.division === targetDiv);
        }

        // Apply jornada filter when in jornada mode
        if (matchViewMode === "jornada" && selectedJornada !== null) {
            filtered = filtered.filter(m => m.spieltag === selectedJornada);
        }

        return filtered.sort((a, b) => {
            const parseDateTime = (dateStr: string, timeStr: string, m?: MatchData) => {
                try {
                    // prefer precomputed localDateTime when available
                    if (m?.localDateTime) return new Date(m.localDateTime).getTime();
                    // use buildMatchDateTime so Canary home match corrections are applied
                    return buildMatchDateTime(dateStr, timeStr, m, stadiums, stadiums).getTime();
                } catch {
                    return 0;
                }
            };
            return parseDateTime(b.date, b.time, b) - parseDateTime(a.date, a.time, a);
        });
    }, [matches, matchDivisionFilter, matchViewMode, selectedJornada]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "Fecha desconocida";
        try {
            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('.');
            if (parts.length !== 3) return dateStr;
            const [day, month, year] = parts.map(Number);
            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
        } catch (e) {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white/50">Cargando datos...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white antialiased flex flex-col">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
                <div className="mx-auto max-w-7xl px-6 py-4">
                    <Link
                        href="/datos"
                        className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white w-fit focus:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Link>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="flex-1 mx-auto max-w-7xl w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Competition & Teams */}
                <div className="lg:col-span-2 flex flex-col">

                    {/* Competition Filters (Fixed at top of column) */}
                    <div className="mb-8 flex-shrink-0">
                        <h2 className="text-xl font-bold mb-4">Competición</h2>
                        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                            <button
                                onClick={() => setTeamFilter("all")}
                                className={`relative p-4 rounded-xl border-2 transition-all ${teamFilter === "all"
                                    ? "border-white/20 bg-white/10"
                                    : "border-white/5 bg-white/5 hover:bg-white/10"
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-3xl">⚽</span>
                                    <span className="text-xs font-medium">Ambas</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setTeamFilter("primera")}
                                className={`relative p-4 rounded-xl border-2 transition-all ${teamFilter === "primera"
                                    ? "border-red-500/50 bg-red-500/10"
                                    : "border-white/5 bg-white/5 hover:bg-white/10"
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-3xl font-bold text-red-400">1ª</span>
                                    <span className="text-xs font-medium">Primera</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setTeamFilter("segunda")}
                                className={`relative p-4 rounded-xl border-2 transition-all ${teamFilter === "segunda"
                                    ? "border-cyan-500/50 bg-cyan-500/10"
                                    : "border-white/5 bg-white/5 hover:bg-white/10"
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-3xl font-bold text-cyan-400">2ª</span>
                                    <span className="text-xs font-medium">Segunda</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Teams Header & Search */}
                    <div className="mb-4 flex items-center justify-between flex-shrink-0">
                        <h2 className="text-xl font-bold">
                            Equipos
                        </h2>

                        <div className="relative w-56">
                            <div className="group relative flex items-center overflow-hidden rounded-full bg-white/5 p-1 shadow-sm ring-1 ring-white/5 backdrop-blur-sm transition-all focus-within:bg-white/10 focus-within:ring-white/20">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-neutral-400">
                                    <Search className="h-3 w-3" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar equipo"
                                    className="flex-1 bg-transparent px-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Teams Grid */}
                    <div className="pb-4">
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-3">
                            {filteredTeams.map((team) => (
                                <Link
                                    key={team.name}
                                    href={`/equipo/${getTeamSlug(team.name)}`}
                                    className="relative bg-white/5 border border-white/5 rounded-lg p-2 hover:bg-white/10 transition-all group cursor-pointer aspect-[3/4] flex flex-col items-center justify-center hover:scale-105 hover:shadow-lg hover:border-white/10"
                                >
                                    {/* Division Badge */}
                                    <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${team.division === "Primera División"
                                        ? "bg-red-500/20 text-red-400"
                                        : "bg-cyan-500/20 text-cyan-400"
                                        }`}>
                                        {team.division === "Primera División" ? "1" : "2"}
                                    </div>

                                    {/* Team Shield */}
                                    <div className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform">
                                        <TeamInitialsBadge
                                            teamName={team.name}
                                            size={40}
                                            className="shadow-inner"
                                        />
                                    </div>

                                    {/* Team Name */}
                                    <p className="text-[9px] text-center text-white/80 leading-tight line-clamp-2 font-medium">
                                        {team.name}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Matches List (Fixed Height with Scroll) */}
                <div className="lg:col-span-1 border-l border-white/10 pl-8 flex flex-col lg:sticky lg:top-24 lg:self-start h-[calc(100vh-120px)]">
                    <div className="flex-shrink-0 mb-4">
                        <h2 className="text-xl font-bold mb-4">
                            Partidos
                        </h2>

                        {/* Match Controls */}
                        <div className="flex flex-col gap-3">
                            {/* Division Filter */}
                            <div className="flex bg-white/5 p-1 rounded-lg">
                                {(["all", "primera", "segunda"] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setMatchDivisionFilter(f)}
                                        className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${matchDivisionFilter === f
                                            ? "bg-white/10 text-white shadow-sm"
                                            : "text-white/40 hover:text-white/70"
                                            }`}
                                    >
                                        {f === "all" ? "Todos" : f === "primera" ? "1ª Div" : "2ª Div"}
                                    </button>
                                ))}
                            </div>

                            {/* Unified Match Selector */}
                            <div className="relative group">
                                <select
                                    value={matchViewMode === "list" ? "all" : selectedJornada?.toString()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "all") {
                                            setMatchViewMode("list");
                                            setSelectedJornada(null);
                                        } else {
                                            setMatchViewMode("jornada");
                                            setSelectedJornada(Number(val));
                                        }
                                    }}
                                    className="w-full appearance-none bg-transparent text-sm font-semibold text-white/90 outline-none cursor-pointer py-2 pr-8 hover:text-white transition-colors"
                                >
                                    <option value="all" className="bg-black text-white">Todos los partidos</option>
                                    {availableJornadas.map((j) => (
                                        <option key={j} value={j} className="bg-black text-white">
                                            Jornada {j}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-white/50 group-hover:text-white transition-colors">
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                        {filteredMatches.map((match, idx) => (
                            <MatchCard key={`${match.date}-${match.home_team}-${idx}`} match={match} formatDate={(m) => formatAdjustedDate(m, stadiums, [])} formatTime={(m) => formatAdjustedTime(m, stadiums, [])} />
                        ))}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
