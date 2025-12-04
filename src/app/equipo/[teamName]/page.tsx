"use client";

export const runtime = "edge";
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { processMatchData, MatchData } from "@/utils/processMatchData";
import { isCanaryHomeMatch, buildMatchDateTime, formatAdjustedTime, formatAdjustedDate } from '@/utils/timeHelpers';
import { getTeamNameFromSlug, getTeamDisplayName } from "@/utils/teamMappings";
import TeamInitialsBadge from "@/components/TeamInitialsBadge";
import MapComponent from "@/components/MapComponent";
import { formatNumber } from "@/utils/formatNumber";
import {
    ScatterChart,
    Scatter,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Area,
    Line,
    AreaChart,
    ComposedChart,
    ReferenceLine,
    Bar,
    BarChart,
} from "recharts";

type Stadium = {
    stadium_name: string;
    team_primary?: string;
    team_sec?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches?: number;
    municipality?: string;
    province?: string;
    ccaa?: string;
    pop_muni?: number;
    pop_prov?: number;
    pop_ccaa?: number;
};

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const interpolateColor = (c1: number[], c2: number[], t: number) => {
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
};

const getColorForOccupancy = (value: number) => {
    // 0: #ef4444 (239, 68, 68)
    // 50: #eab308 (234, 179, 8)
    // 100: #22c55e (34, 197, 94)
    if (value < 50) {
        return interpolateColor([239, 68, 68], [234, 179, 8], value / 50);
    } else {
        return interpolateColor([234, 179, 8], [34, 197, 94], (value - 50) / 50);
    }
};

// Color scale for frequency (0..100) — use high-contrast green->amber->red so differences are clear
const getColorForFrequency = (value: number) => {
    // Use three-color interpolation: green -> amber -> red
    const t = Math.max(0, Math.min(1, value / 100));
    // We want low frequency -> red, high frequency -> green.
    // Keep 3-color interpolation but inverted: red -> amber -> green.
    if (t <= 0.5) {
        // interpolate red (#EF4444 = [239,68,68]) -> amber (#F59E0B = [245,158,11])
        const p = t / 0.5;
        const c1 = [239, 68, 68];
        const c2 = [245, 158, 11];
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * p);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * p);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * p);
        return `rgb(${r}, ${g}, ${b})`;
    }
    // interpolate amber -> green (#34D399 = [52,211,153])
    const p = (t - 0.5) / 0.5;
    const c1 = [245, 158, 11];
    const c2 = [52, 211, 153];
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * p);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * p);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * p);
    return `rgb(${r}, ${g}, ${b})`;
};

// Exportar un gráfico (SVG dentro de un contenedor) a PNG con leyenda, márgenes y etiquetas de datos
async function exportChartAsPng(
    containerId: string,
    filename: string,
    legendItems?: { color: string; label: string }[],
    title?: string
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const svg = container.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    // Clonar el SVG para no modificar el original
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

    // Inyectar estilos de fuente explícitamente en el SVG clonado
    const styleElement = document.createElement("style");
    styleElement.textContent = `
        text { font-family: 'Inter', sans-serif !important; }
    `;
    clonedSvg.prepend(styleElement);

    // Extraer y añadir etiquetas de datos en puntos (círculos con r=3)
    // pero solo para scatter charts y gráficos de línea/área con puntos visibles
    const circles = clonedSvg.querySelectorAll('circle[r="3"]');
    const addedLabels = new Set<string>();

    circles.forEach((circle, idx) => {
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');

        // Obtener el texto del tooltip si existe (desde la estructura Recharts)
        const parent = circle.parentElement;
        if (parent) {
            // Buscar si hay un tspan o text con el valor en el tooltip
            const tooltipTexts = parent.querySelectorAll('tspan, text');
            let value: string | null = null;

            // Para scatter charts, intentar extraer el valor de los atributos del padre
            if (parent.hasAttribute('data-value')) {
                value = parent.getAttribute('data-value');
            } else if (parent.getAttribute('class')?.includes('recharts-scatter-point')) {
                // Alternativa: acceder al data del punto via la estructura DOM
                const dataPoint = (parent as any).__reactProps$?.children?.[0]?.props?.payload;
                if (dataPoint) {
                    value = dataPoint.y?.toFixed(1) || String(idx);
                }
            }

            // Si no encontramos valor, usar un índice simple
            if (!value) {
                value = String(idx + 1);
            }

            const key = `${cx.toFixed(0)}-${cy.toFixed(0)}`;
            if (!addedLabels.has(key)) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', String(cx));
                text.setAttribute('y', String(cy - 12));
                text.setAttribute('font-size', '10');
                text.setAttribute('fill', '#ffffff');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('stroke', '#000000');
                text.setAttribute('stroke-width', '0.5');
                text.setAttribute('stroke-linejoin', 'round');
                text.textContent = value;
                parent.appendChild(text);
                addedLabels.add(key);
            }
        }
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const viewBox = svg.viewBox?.baseVal;
        const originalWidth = viewBox?.width || svg.clientWidth || 1200;
        const originalHeight = viewBox?.height || svg.clientHeight || 400;

        // Configuración de escala para alta resolución
        const scale = 3; // 3x resolución

        // Configuración de márgenes y leyenda
        const margin = 40 * scale;
        const legendHeight = (legendItems && legendItems.length > 0 ? 60 : 0) * scale;
        const titleHeight = (title ? 50 : 0) * scale;

        const width = (originalWidth * scale) + (margin * 2);
        const height = (originalHeight * scale) + (margin * 2) + legendHeight + titleHeight;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Fondo negro
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // Dibujar título si existe
        if (title) {
            ctx.font = `bold ${24 * scale}px Inter, sans-serif`;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.fillText(title, margin, margin + (20 * scale));
        }

        // Dibujar gráfico centrado con margen
        const chartY = margin + titleHeight;
        ctx.drawImage(img, margin, chartY, originalWidth * scale, originalHeight * scale);

        // Dibujar leyenda si existe
        if (legendItems && legendItems.length > 0) {
            ctx.font = `bold ${14 * scale}px Inter, sans-serif`;
            ctx.textBaseline = "middle";

            // Calcular ancho total de la leyenda para centrarla
            let totalLegendWidth = 0;
            const itemWidths = legendItems.map(item => {
                const textWidth = ctx.measureText(item.label).width;
                const w = (20 * scale) + (8 * scale) + textWidth + (24 * scale);
                totalLegendWidth += w;
                return w;
            });
            totalLegendWidth -= (24 * scale);

            let currentX = (width - totalLegendWidth) / 2;
            const legendY = height - margin - (legendHeight / 2) + (10 * scale);

            legendItems.forEach((item, i) => {
                ctx.fillStyle = item.color;
                ctx.fillRect(currentX, legendY - (6 * scale), 12 * scale, 12 * scale);

                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "left";
                ctx.fillText(item.label, currentX + (18 * scale), legendY);

                currentX += itemWidths[i];
            });
        }

        // Añadir "Fuente: AforoLab" discreto
        ctx.font = `${10 * scale}px Inter, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.textAlign = "right";
        ctx.fillText("Fuente: AforoLab", width - margin, height - (10 * scale));

        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, "image/png");
    };
    img.src = url;
}

export default function TeamPage() {
    const params = useParams();
    const slug = params.teamName as string;
    const teamName = getTeamNameFromSlug(slug);

    const [stadiums, setStadiums] = useState<Stadium[]>([]);
    const [fullStadiumData, setFullStadiumData] = useState<Stadium[]>([]);
    const [stadiumPopulations, setStadiumPopulations] = useState<Record<string, any>>({});
    const [matches, setMatches] = useState<MatchData[]>([]);
    const [loading, setLoading] = useState(true);

    // Small sticky header state + ref to detect when to show it
    const teamHeaderRef = useRef<HTMLDivElement | null>(null);
    const [showMiniHeader, setShowMiniHeader] = useState<boolean>(false);

    // equipo para comparar en el patrón semanal
    const [comparisonTeam, setComparisonTeam] = useState<string>("");
    const [weeklyMetric, setWeeklyMetric] = useState<"attendance" | "occupancy">("attendance");

    // Estados de comparación para cada gráfico
    const [timeSeriesComparison, setTimeSeriesComparison] = useState<string>("");
    const [evolutionMetric, setEvolutionMetric] = useState<"attendance" | "occupancy">("attendance");
    const [scatterComparison, setScatterComparison] = useState<string>("");
    const [densityComparison, setDensityComparison] = useState<string>("");
    // Removed impactComparison as requested


    // Tooltips específicos
    const RadarTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-2 shadow-xl min-w-[140px] z-50">
                    <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                            {payload[0].payload.dia}
                        </span>
                    </div>
                    <div className="space-y-0.5">
                        {payload.map((entry: any, index: number) => {
                            const isComparison = entry.name !== teamName && entry.name !== "Asistencia promedio" && entry.name !== "Ocupación promedio";
                            const label = isComparison ? entry.name : (weeklyMetric === "attendance" ? "Asistencia" : "Ocupación");
                            const value = weeklyMetric === "attendance"
                                ? `~${formatNumber(entry.value)}`
                                : `${entry.value.toFixed(1)}%`;

                            return (
                                <div key={index} className="flex justify-between items-end gap-4">
                                    <span className="text-[10px] text-white/50" style={{ color: entry.color }}>{label}</span>
                                    <span className="text-xs font-mono font-bold text-white">
                                        {value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    const ScatterTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-2 shadow-xl min-w-[140px] z-50">
                    <div className="flex flex-col mb-1.5 border-b border-white/5 pb-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                            Jornada {data.jornada}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[180px]">
                            {data.rival}
                        </span>
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex justify-between items-end gap-4">
                            <span className="text-[10px] text-white/50">Asistencia</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                                {formatNumber(data.x)}
                            </span>
                        </div>
                        <div className="flex justify-between items-end gap-4">
                            <span className="text-[10px] text-white/50">Ocupación</span>
                            <span className="text-xs font-mono font-bold text-amber-400">
                                {data.y.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const EvolutionTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Filter duplicates and unwanted bands
            const uniquePayload = payload.filter((entry: any, index: number, self: any[]) =>
                index === self.findIndex((t) => (
                    t.name === entry.name && t.value === entry.value
                ))
            );

            return (
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-2 shadow-xl min-w-[140px] z-50">
                    <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                            Jornada {label}
                        </span>
                    </div>
                    <div className="space-y-0.5">
                        {uniquePayload.map((entry: any, index: number) => {
                            if (entry.name === "Banda superior" || entry.name === "Banda inferior" || entry.name === "value") return null;

                            let value = "";
                            if (evolutionMetric === "attendance") {
                                value = formatNumber(entry.value);
                            } else {
                                value = `${entry.value.toFixed(1)}%`;
                            }

                            return (
                                <div key={index} className="flex justify-between items-end gap-4">
                                    <span className="text-[10px] text-white/50" style={{ color: entry.color }}>{entry.name}</span>
                                    <span className="text-xs font-mono font-bold text-white">
                                        {value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const metricsRes = await fetch("/data/home_metrics.json").then((res) =>
                    res.json()
                );
                const loadedStadiums = metricsRes.all_stadiums || [];
                setStadiums(loadedStadiums);

                const fullDataRes = await fetch(
                    "/data/stadium_full_data.json"
                ).then((res) => res.json());
                setFullStadiumData(fullDataRes);

                // cargar poblaciones corregidas por estadio (si existe)
                try {
                    const pops = await fetch(
                        "/data/stadium_populations.json"
                    ).then((res) => res.json());
                    setStadiumPopulations(pops || {});
                } catch (e) {
                    // no es crítico, seguimos sin las poblaciones externas
                    console.warn("No se pudo cargar stadium_populations.json", e);
                    setStadiumPopulations({});
                }

                const processedData = await processMatchData(loadedStadiums);
                setMatches(processedData.allMatches || []);
            } catch (err) {
                console.error("Error loading data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const [allTeamStadiums, setAllTeamStadiums] = useState<Stadium[]>([]);
    const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);

    // Detect when the large team header scrolls out of view so we can show a mini header
    useEffect(() => {
        const onScroll = () => {
            if (!teamHeaderRef.current) return;
            const rect = teamHeaderRef.current.getBoundingClientRect();
            // show mini header once the main header bottom is above a small threshold (header height)
            const threshold = 64; // px
            setShowMiniHeader(rect.bottom <= threshold);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [teamHeaderRef]);

    // Find all stadiums for the team and select the default one
    useEffect(() => {
        if (!teamName) return;

        // Get stadiums from full data
        const fullDataStadiums = fullStadiumData.filter(
            (s) => getTeamDisplayName(s.team_primary || "") === teamName
        );

        // Get stadiums from metrics data (contains Spotify Camp Nou)
        const metricsStadiums = stadiums.filter(
            (s) => getTeamDisplayName(s.team_primary || "") === teamName
        );

        // Merge and deduplicate by stadium_name
        const mergedMap = new Map<string, Stadium>();

        [...fullDataStadiums, ...metricsStadiums].forEach(s => {
            if (!mergedMap.has(s.stadium_name)) {
                mergedMap.set(s.stadium_name, s as Stadium);
            } else {
                // Merge properties if needed, prefer fullData
                const existing = mergedMap.get(s.stadium_name)!;
                mergedMap.set(s.stadium_name, { ...s, ...existing } as Stadium);
            }
        });

        const uniqueStadiums = Array.from(mergedMap.values());

        if (uniqueStadiums.length === 0) {
            setAllTeamStadiums([]);
            setSelectedStadium(null);
        } else {
            // Sort: Camp Nou first for Barca, otherwise by capacity
            uniqueStadiums.sort((a, b) => {
                if (teamName === "FC Barcelona") {
                    if (a.stadium_name.includes("Camp Nou")) return -1;
                    if (b.stadium_name.includes("Camp Nou")) return 1;
                }
                return b.capacity - a.capacity;
            });
            setAllTeamStadiums(uniqueStadiums);
            // If only one stadium, select it. If multiple, default to General (null)
            if (uniqueStadiums.length === 1) {
                setSelectedStadium(uniqueStadiums[0]);
            } else {
                setSelectedStadium(null);
            }
        }
    }, [fullStadiumData, stadiums, teamName]);

    const teamStadium = useMemo(() => {
        // If General is selected (null), use the main stadium (first in list) for context
        // This ensures we always have a stadium for capacity reference etc.
        const baseStadium = selectedStadium || allTeamStadiums[0];

        if (!baseStadium) return null;

        // Aplicar valores de población corregidos si existen en el JSON de poblaciones
        const pops = stadiumPopulations?.[baseStadium.stadium_name];
        if (pops) {
            const merged: Stadium = { ...baseStadium };
            if (pops.pop_muni !== undefined && pops.pop_muni !== null) merged.pop_muni = pops.pop_muni;
            if (pops.pop_prov !== undefined && pops.pop_prov !== null) merged.pop_prov = pops.pop_prov;
            if (pops.pop_ccaa !== undefined && pops.pop_ccaa !== null) merged.pop_ccaa = pops.pop_ccaa;
            return merged;
        }

        return baseStadium;
    }, [selectedStadium, allTeamStadiums, stadiumPopulations]);

    const teamMatches = useMemo(() => {
        if (!teamName) return [];
        return matches
            .filter((m) => m.home_team === teamName || m.away_team === teamName)
            .sort((a, b) => {
                const parseDateTime = (dateStr: string, timeStr: string, m?: MatchData) => {
                    try {
                        if (m?.localDateTime) return new Date(m.localDateTime).getTime();
                        return buildMatchDateTime(dateStr, timeStr, m, stadiums, fullStadiumData).getTime();
                    } catch {
                        return 0;
                    }
                };
                return parseDateTime(a.date, a.time, a) - parseDateTime(b.date, b.time, b);
            });
    }, [matches, teamName, stadiums, fullStadiumData]);

    const homeMatches = useMemo(() => {
        let matches = teamMatches.filter((m) => m.home_team === teamName && m.attendance);

        // If we have multiple stadiums, filter by the selected one
        if (allTeamStadiums.length > 1 && selectedStadium) {
            matches = matches.filter(m => {
                // If match has explicit stadium_name, use it
                if (m.stadium_name) {
                    return m.stadium_name === selectedStadium.stadium_name;
                }
                return true;
            });
        }

        return matches;
    }, [teamMatches, teamName, allTeamStadiums.length, selectedStadium]);

    const awayMatches = useMemo(() => {
        return teamMatches.filter((m) => m.away_team === teamName && m.attendance);
    }, [teamMatches, teamName]);

    const stats = useMemo(() => {
        if (homeMatches.length === 0) return null;

        const attendances = homeMatches.map((m) => m.attendance || 0);
        const occupancies = homeMatches.map((m) => m.occupancyPct || 0);

        const avg =
            attendances.reduce((a, b) => a + b, 0) / attendances.length;

        // Find max/min matches
        const maxMatch = homeMatches.reduce((prev, current) => ((prev.attendance || 0) > (current.attendance || 0)) ? prev : current);
        const minMatch = homeMatches.reduce((prev, current) => ((prev.attendance || 0) < (current.attendance || 0) && (current.attendance || 0) > 0) ? prev : current);

        const avgOcc =
            occupancies.reduce((a, b) => a + b, 0) / occupancies.length;

        const variance =
            attendances.reduce(
                (sum, val) => sum + Math.pow(val - avg, 2),
                0
            ) / attendances.length;
        const stdDev = Math.sqrt(variance);

        return { avg, max: maxMatch.attendance || 0, maxMatch, min: minMatch.attendance || 0, minMatch, stdDev, avgOcc, total: homeMatches.length };
    }, [homeMatches]);

    const getComparisonMatches = (target: string) => {
        if (!target) return [];
        if (target === "__global__") return matches.filter(m => m.attendance);
        if (target === "__primera__") return matches.filter(m => m.division === "Primera División" && m.attendance);
        if (target === "__segunda__") return matches.filter(m => m.division === "Segunda División" && m.attendance);
        return matches.filter(m => m.home_team === target && m.attendance);
    };

    const timeSeriesData = useMemo(() => {
        // Obtener jornadas únicas de ambos conjuntos de datos
        const compMatches = timeSeriesComparison ? getComparisonMatches(timeSeriesComparison) : [];

        const allJornadas = new Set<number>();
        homeMatches.forEach(m => allJornadas.add(m.spieltag));
        compMatches.forEach(m => allJornadas.add(m.spieltag));

        const sortedJornadas = Array.from(allJornadas).sort((a, b) => a - b);

        // Mapas de acceso rápido para ambas métricas
        const homeByJornada = new Map(homeMatches.map(m => [m.spieltag, m]));

        const compByJornada: Record<number, { attTotal: number; occTotal: number; count: number }> = {};
        compMatches.forEach(m => {
            if (!compByJornada[m.spieltag]) compByJornada[m.spieltag] = { attTotal: 0, occTotal: 0, count: 0 };
            compByJornada[m.spieltag].attTotal += m.attendance || 0;
            compByJornada[m.spieltag].occTotal += m.occupancyPct || 0;
            compByJornada[m.spieltag].count += 1;
        });

        return sortedJornadas.map((jornada, idx) => {
            const m = homeByJornada.get(jornada);

            // Determine value based on metric
            const mainValue = evolutionMetric === "attendance" ? (m?.attendance || null) : (m?.occupancyPct || null);

            // Get comparison value based on metric
            const compEntry = compByJornada[jornada];
            let compVal: number | null = null;
            if (compEntry && compEntry.count > 0) {
                compVal = evolutionMetric === "attendance"
                    ? compEntry.attTotal / compEntry.count
                    : compEntry.occTotal / compEntry.count;
            }

            // Calculate bands only for attendance
            const upper = evolutionMetric === "attendance" ? (stats?.avg || 0) + (stats?.stdDev || 0) : null;
            const lower = evolutionMetric === "attendance" ? Math.max(0, (stats?.avg || 0) - (stats?.stdDev || 0)) : null;

            return {
                index: idx + 1,
                jornada: jornada,
                rival: m?.away_team || (compVal ? "Comparativa" : "-"),
                fecha: m ? (m.localDate || formatAdjustedDate(m, stadiums, fullStadiumData)) : "-",
                resultado: m ? `${m.home_goals}-${m.away_goals}` : "-",
                value: mainValue,
                ocupacion: m?.occupancyPct || 0,
                capacidad: teamStadium?.capacity || 0,
                promedio: evolutionMetric === "attendance" ? (stats?.avg || 0) : (stats?.avgOcc || 0),
                upperBand: upper,
                lowerBand: lower,
                comparison: compVal
            };
        });
    }, [homeMatches, teamStadium, stats, timeSeriesComparison, matches, evolutionMetric]);

    const scatterData = useMemo(() => {
        const base = homeMatches.map((m) => ({
            x: m.attendance || 0,
            y: m.occupancyPct || 0,
            jornada: m.spieltag,
            rival: m.away_team,
            fecha: m.localDate || formatAdjustedDate(m, stadiums, fullStadiumData),
            resultado: `${m.home_goals}-${m.away_goals}`,
            type: "current"
        }));

        if (!scatterComparison) return base;

        const compMatches = getComparisonMatches(scatterComparison);
        const compPoints = compMatches.map(m => ({
            x: m.attendance || 0,
            y: m.occupancyPct || 0,
            jornada: m.spieltag,
            rival: m.away_team || m.home_team, // En global/resto puede ser confuso, usamos home_team si es aggregate
            fecha: m.localDate || formatAdjustedDate(m, stadiums, fullStadiumData),
            resultado: `${m.home_goals}-${m.away_goals}`,
            type: "comparison"
        }));

        return [...base, ...compPoints];
    }, [homeMatches, scatterComparison, matches]);

    // Stats for the comparison group (when user selects a comparison team/group on scatter)
    const scatterComparisonStats = useMemo(() => {
        if (!scatterComparison) return null;
        const compMatches = getComparisonMatches(scatterComparison);
        // keep only matches with attendance (for meaningful averages)
        const valid = compMatches.filter(m => m.attendance);
        if (!valid.length) return null;
        const attendances = valid.map(m => m.attendance || 0);
        const occupancies = valid.map(m => m.occupancyPct || 0);
        const avgAtt = attendances.reduce((a, b) => a + b, 0) / attendances.length;
        const avgOcc = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;
        return { avg: avgAtt, avgOcc };
    }, [scatterComparison, matches]);

    const matchesByOpponent = useMemo(() => {
        return homeMatches.map((m) => ({
            rival: m.away_team,
            jornada: m.spieltag,
            fecha: formatAdjustedDate(m, stadiums, fullStadiumData),
            resultado: `${m.home_goals}-${m.away_goals}`,
            asistencia: m.attendance || 0,
            ocupacion: m.occupancyPct || 0,
        }));
    }, [homeMatches]);

    // Impacto como visitante: ocupación media por estadio rival, ordenado
    const awayRivalImpact = useMemo(() => {
        if (awayMatches.length === 0) return [];

        // Función auxiliar para obtener día de la semana en español
        const getDayOfWeek = (dateStr: string): string => {
            try {
                const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split(".");
                const [day, month, year] = parts.map(Number);
                const date = new Date(year, month - 1, day);
                const dayNum = date.getDay();
                return dayNames[dayNum] || "";
            } catch {
                return "";
            }
        };

        // Crear mapa de media local de cada estadio rival
        const rivalMediaLocal: Record<string, number> = {};
        stadiums.forEach((s) => {
            if (s.team_primary) {
                rivalMediaLocal[getTeamDisplayName(s.team_primary)] = s.occ_avg_pct || 0;
            }
        });

        const byRival: Record<
            string,
            { totalOcc: number; count: number; dayOfWeek: string; attendance: number }
        > = {};

        awayMatches.forEach((m) => {
            const rival = m.home_team;
            const occ = m.occupancyPct || 0;
            if (!byRival[rival]) {
                byRival[rival] = { totalOcc: 0, count: 0, dayOfWeek: "", attendance: 0 };
            }
            byRival[rival].totalOcc += occ;
            byRival[rival].count += 1;
            byRival[rival].dayOfWeek = getDayOfWeek(m.date);
            byRival[rival].attendance = m.attendance || 0;
        });

        const arr = Object.entries(byRival).map(
            ([rival, { totalOcc, count, dayOfWeek, attendance }]) => {
                const avgOcc = totalOcc / count;
                const rivalMediaLocal_val = rivalMediaLocal[rival] || 0;
                const exceedsMedia = avgOcc > rivalMediaLocal_val;
                return {
                    rival,
                    avgOcc,
                    matches: count,
                    rivalMediaLocal: rivalMediaLocal_val,
                    exceedsMedia,
                    dayOfWeek,
                    attendance,
                };
            }
        );

        arr.sort((a, b) => b.avgOcc - a.avgOcc);
        return arr.slice(0, 12);
    }, [awayMatches, stadiums]);
    // Impact custom renderer: draw point and arrow (left/right) inside the chart SVG
    // Impact custom renderer: draw point and arrow (left/right) inside the chart SVG
    const renderImpactPoint = (props: any) => {
        const { cx, cy, payload } = props;
        if (cx == null || cy == null) return <g />;
        const isPositive = payload.exceedsMedia;
        const color = isPositive ? "#22c55e" : "#ef4444";

        return (
            <g cursor="pointer">
                <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.6} />
                <g transform={`translate(${cx + (isPositive ? 14 : -14)}, ${cy})`}>
                    {isPositive ? (
                        <path d="M-4 0h8m-4-4l4 4-4 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                        <path d="M4 0h-8m4-4l-4 4 4 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </g>
            </g>
        );
    };

    // Heat-map: ocupación por hora del día y día de la semana (agregado con matches)
    const occupancyHeatmapData = useMemo(() => {
        const byHourDay: Record<string, { total: number; count: number; matches: any[] }> = {};

        homeMatches.forEach((m) => {
            if (!m.time || !m.date) return;

            // Build a Date object that takes into account local corrections; prefer precomputed localDateTime when available
            const dateTime = m.localDateTime ? new Date(m.localDateTime) : buildMatchDateTime(m.date, m.time, m, stadiums, fullStadiumData);
            const dayOfWeek = dateTime.getDay();
            const hour = dateTime.getHours();

            const key = `${dayOfWeek}:${hour}`;
            if (!byHourDay[key]) {
                byHourDay[key] = { total: 0, count: 0, matches: [] };
            }
            byHourDay[key].total += m.occupancyPct || 0;
            byHourDay[key].count += 1;
            byHourDay[key].matches.push({
                jornada: m.spieltag,
                rival: m.away_team,
                fecha: m.localDate || formatAdjustedDate(m, stadiums, fullStadiumData),
                hora: m.localTime || formatAdjustedTime(m, stadiums, fullStadiumData),
                ocupacion: m.occupancyPct || 0,
            });
        });

        // Build lists of days/hours that actually have data (omit empty rows/cols)
        const daySet = new Set<number>();
        const hourSet = new Set<number>();

        Object.keys(byHourDay || {}).forEach((k) => {
            const [dStr, hStr] = k.split(":");
            const d = parseInt(dStr);
            const h = parseInt(hStr);
            const entry = byHourDay?.[k];
            if (entry && entry.count > 0) {
                daySet.add(d);
                hourSet.add(h);
            }
        });

        const days = Array.from(daySet).sort((a, b) => a - b).map(d => ({ idx: d, name: dayNames[d] }));
        const hours = Array.from(hourSet).sort((a, b) => a - b);

        // If no hours/days found, fall back to a reasonable range (12-23)
        const displayHours = hours.length > 0 ? hours : Array.from({ length: 12 }).map((_, i) => 12 + i);
        const displayDays = days.length > 0 ? days : Array.from({ length: 7 }).map((_, i) => ({ idx: i, name: dayNames[i] }));

        const cells: Array<{ dayIdx: number; day: string; hour: number; value: number; matches: any[]; count: number }> = [];
        displayDays.forEach((d) => {
            displayHours.forEach((h) => {
                const key = `${typeof d === 'number' ? d : d.idx}:${h}`;
                const entry = byHourDay[key];
                const value = entry && entry.count > 0 ? entry.total / entry.count : 0;
                const matchesArr = (entry && entry.matches) || [];
                cells.push({ dayIdx: typeof d === 'number' ? d : d.idx, day: typeof d === 'number' ? dayNames[d] : d.name, hour: h, value, matches: matchesArr, count: matchesArr.length });
            });
        });

        // calc max matches count to later normalize color mapping
        const maxCount = cells.reduce((m, c) => Math.max(m, c.count), 0) || 1;

        return { cells, days: displayDays, hours: displayHours, maxCount } as any;
    }, [homeMatches]);

    // Heatmap tooltip state (declaración necesaria para handlers)
    const [heatmapTooltip, setHeatmapTooltip] = useState<{
        visible: boolean;
        left: number;
        top: number;
        matches: any[];
        title?: string;
    }>({ visible: false, left: 0, top: 0, matches: [], title: "" });



    // Radar chart: análisis por día para el equipo base
    const radarData = useMemo(() => {
        const byDay: Record<
            number,
            { total: number; count: number; matches: any[] }
        > = {};

        homeMatches.forEach((m) => {
            // Use precomputed localDateTime when available, otherwise compute
            const dateTime = m.localDateTime ? new Date(m.localDateTime) : buildMatchDateTime(m.date, m.time, m, stadiums, fullStadiumData);
            const dayOfWeek = dateTime.getDay();

            if (!byDay[dayOfWeek]) {
                byDay[dayOfWeek] = { total: 0, count: 0, matches: [] };
            }
            // Usar la métrica seleccionada
            const value = weeklyMetric === "attendance" ? (m.attendance || 0) : (m.occupancyPct || 0);

            byDay[dayOfWeek].total += value;
            byDay[dayOfWeek].count += 1;
            byDay[dayOfWeek].matches.push({
                jornada: m.spieltag,
                rival: m.away_team,
                valor: value,
            });
        });

        return dayNames.map((dia, idx) => ({
            dia,
            promedio: byDay[idx]
                ? (byDay[idx].total / byDay[idx].count)
                : 0,
            partidos: byDay[idx]?.matches || [],
        }));
    }, [homeMatches, weeklyMetric]);

    // Helper para obtener partidos de comparación
    const getComparisonMatchesGeneric = (compValue: string) => {
        if (!compValue) return [];
        if (compValue === "__global__") return matches;
        if (compValue === "__primera__") return matches.filter(m => m.division === "Primera División");
        if (compValue === "__segunda__") return matches.filter(m => m.division === "Segunda División");
        return matches.filter(m => m.home_team === compValue);
    };

    // Radar semanal de un equipo cualquiera (para comparativa)
    const buildWeeklyRadarForTarget = (target: string) => {
        const targetMatches = getComparisonMatchesGeneric(target);

        const byDay: Record<
            number,
            { total: number; count: number }
        > = {};

        targetMatches.forEach((m) => {
            const dateTime = m.localDateTime ? new Date(m.localDateTime) : buildMatchDateTime(m.date, m.time, m, stadiums, fullStadiumData);
            const dayOfWeek = dateTime.getDay();

            if (!byDay[dayOfWeek]) {
                byDay[dayOfWeek] = { total: 0, count: 0 };
            }

            const value = weeklyMetric === "attendance" ? (m.attendance || 0) : (m.occupancyPct || 0);
            byDay[dayOfWeek].total += value;
            byDay[dayOfWeek].count += 1;
        });

        return dayNames.map((dia, idx) => ({
            dia,
            promedio: byDay[idx]
                ? (byDay[idx].total / byDay[idx].count)
                : 0,
        }));
    };

    const comparisonRadarData = useMemo(() => {
        if (!comparisonTeam) return null;
        return buildWeeklyRadarForTarget(comparisonTeam);
    }, [comparisonTeam, matches, weeklyMetric]);

    // Datos combinados para el radar (dos equipos)
    const combinedWeeklyRadarData = useMemo(() => {
        const rivalCap = comparisonTeam ? (
            fullStadiumData.find(s => getTeamDisplayName(s.team_primary || "") === comparisonTeam)?.capacity ||
            stadiums.find(s => getTeamDisplayName(s.team_primary || "") === comparisonTeam)?.capacity || 0
        ) : 0;

        return dayNames.map((dia, idx) => ({
            dia,
            base: radarData[idx]?.promedio || 0,
            comparison: comparisonRadarData?.[idx]?.promedio || 0,
            capacity: teamStadium?.capacity || 0,
            rivalCapacity: rivalCap
        }));
    }, [radarData, comparisonRadarData, teamStadium, comparisonTeam, fullStadiumData, stadiums]);

    // Lista de equipos disponibles para comparar
    const comparisonOptions = useMemo(() => {
        const names = new Set<string>();

        fullStadiumData.forEach((s) => {
            // Añadir equipo principal
            if (s.team_primary) {
                const display = getTeamDisplayName(s.team_primary);
                if (display && display !== teamName) {
                    names.add(display);
                }
            }

            // Añadir equipo secundario (ej: Real Sociedad B)
            if (s.team_sec) {
                const display = getTeamDisplayName(s.team_sec);
                if (display && display !== teamName) {
                    names.add(display);
                }
            }
        });

        const teams = Array.from(names).sort((a, b) =>
            a.localeCompare(b, "es")
        );

        return [
            { label: "Media General", value: "__global__" },
            { label: "Media Primera", value: "__primera__" },
            { label: "Media Segunda", value: "__segunda__" },
            ...teams.map(t => ({ label: t, value: t }))
        ];
    }, [fullStadiumData, teamName]);

    // Distribución de densidad de ocupación
    const densityData = useMemo(() => {
        const createBuckets = (dataMatches: any[]) => {
            const buckets = Array.from({ length: 20 }, (_, i) => ({
                range: `${(i + 1) * 5}%`,
                min: i * 5,
                max: (i + 1) * 5,
                count: 0,
                matches: [] as any[],
            }));

            dataMatches.forEach((m) => {
                const occ = m.occupancyPct || 0;
                const bucketIndex = Math.min(Math.floor(occ / 5), 19);
                buckets[bucketIndex].count += 1;
                buckets[bucketIndex].matches.push({
                    jornada: m.spieltag,
                    rival: m.away_team,
                    ocupacion: occ,
                    date: m.date,
                    result: `${m.home_goals}-${m.away_goals}`
                });
            });
            return buckets;
        };

        const baseBuckets = createBuckets(homeMatches);
        const baseTotal = homeMatches.length || 1;

        if (!densityComparison) {
            return baseBuckets.map(b => ({
                ...b,
                freq: (b.count / baseTotal) * 100,
                partidos: b.matches
            }));
        }

        const compMatches = getComparisonMatchesGeneric(densityComparison);
        const compBuckets = createBuckets(compMatches);
        const compTotal = compMatches.length || 1;

        return baseBuckets.map((b, i) => ({
            ...b,
            partidos: b.matches,
            freq: (b.count / baseTotal) * 100,
            compFreq: (compBuckets[i].count / compTotal) * 100
        }));
    }, [homeMatches, densityComparison, matches]);

    // (removed duplicate simplified `awayRivalImpact` - complex version above is kept)

    /*
    const renderAwayImpactPoint = (props: any) => {
        const { cx, cy, payload } = props;
        if (!cx || !cy) return null;
        return (
            <circle cx={cx} cy={cy} r={5} fill={payload.avgOcc > 70 ? "#22c55e" : "#ef4444"} stroke="#fff" strokeWidth={1} />
        );
    };
    */

    // Contexto poblacional
    const populationContext = useMemo(() => {
        if (!teamStadium || !stats) return null;

        const avgAttendance = stats.avg;

        return {
            municipal: teamStadium.pop_muni
                ? {
                    ratio: (avgAttendance / teamStadium.pop_muni) * 100,
                    population: teamStadium.pop_muni,
                    penetration:
                        (avgAttendance / teamStadium.pop_muni) * 100,
                }
                : null,
            provincial: teamStadium.pop_prov
                ? {
                    ratio: (avgAttendance / teamStadium.pop_prov) * 100,
                    population: teamStadium.pop_prov,
                    penetration:
                        (avgAttendance / teamStadium.pop_prov) * 100,
                }
                : null,
            autonomic: teamStadium.pop_ccaa
                ? {
                    ratio: (avgAttendance / teamStadium.pop_ccaa) * 100,
                    population: teamStadium.pop_ccaa,
                    penetration:
                        (avgAttendance / teamStadium.pop_ccaa) * 100,
                }
                : null,
        };
    }, [teamStadium, stats]);

    // determine division for this team using teamMatches (fallback to global matches)
    const division = teamMatches.length > 0 ? teamMatches[teamMatches.length - 1].division : (matches[0]?.division || "");
    const isDivisionPrimera = division === "Primera División";

    // Calcular max X para Scatter (incluyendo capacidades)
    const scatterMaxX = useMemo(() => {
        let max = 0;
        if (scatterData.length) max = Math.max(...scatterData.map(d => d.x));
        if (teamStadium?.capacity) max = Math.max(max, teamStadium.capacity);

        if (scatterComparison && !["__global__", "__primera__", "__segunda__"].includes(scatterComparison)) {
            const rival = fullStadiumData.find(s => getTeamDisplayName(s.team_primary || "") === scatterComparison);
            if (rival?.capacity) max = Math.max(max, rival.capacity);
        }
        return Math.ceil(max * 1.05);
    }, [scatterData, teamStadium, scatterComparison, fullStadiumData]);

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;

    // Time helpers moved to shared utils/timeHelpers.ts

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white/50">Cargando datos...</div>
            </div>
        );
    }

    if (!teamName || !teamStadium) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center flex-col gap-4">
                <div className="text-white/50">Equipo no encontrado</div>
                <Link
                    href="/datos/principal"
                    className="text-cyan-400 hover:text-cyan-300"
                >
                    Volver
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white antialiased">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center">

                    <Link
                        href="/datos/principal"
                        className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white w-fit focus:outline-none"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Link>
                    {/* Small sticky team header that appears when the main team header scrolls out */}
                    {/* Small sticky team header that appears when the main team header scrolls out */}
                    <div
                        className={`ml-4 inline-flex items-center gap-3 transition-all duration-300 ${showMiniHeader && teamName ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                            }`}
                    >
                        {teamName && (
                            <>
                                <TeamInitialsBadge teamName={teamName} size={28} className="rounded-full" />
                                <div className="text-sm font-semibold text-white/90 truncate max-w-[260px]">{teamName}</div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-[1600px] px-6 py-8">
                {/* Team Header */}
                <div ref={teamHeaderRef} className="mb-12 pb-8 border-b border-white/10">
                    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <TeamInitialsBadge teamName={teamName} size={56} className="rounded-full shadow-lg" />
                            <div>
                                <h1 className="text-4xl font-bold leading-tight">{teamName}</h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-sm text-white/50 sm:flex-row sm:items-center sm:gap-3">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${isDivisionPrimera
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                    }`}
                            >
                                {division}
                            </span>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                <span>{selectedStadium ? teamStadium.stadium_name : "Todos los estadios"}</span>
                                {teamStadium.municipality && selectedStadium && (
                                    <div className="flex items-center gap-2 text-white/60">
                                        <span className="hidden sm:inline">·</span>
                                        <span>{teamStadium.municipality}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stadium Selector (Discreet Tabs) */}
                    {allTeamStadiums.length > 1 && (
                        <div className="flex items-center gap-6 mb-8 border-b border-white/10 pb-1">
                            <button
                                onClick={() => setSelectedStadium(null)}
                                className={`text-sm font-medium pb-2 transition-all relative ${!selectedStadium
                                    ? "text-white"
                                    : "text-white/40 hover:text-white/70"
                                    }`}
                            >
                                General
                                {!selectedStadium && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
                                )}
                            </button>
                            {allTeamStadiums.map((stadium) => (
                                <button
                                    key={stadium.stadium_name}
                                    onClick={() => setSelectedStadium(stadium)}
                                    className={`text-sm font-medium pb-2 transition-all relative ${selectedStadium?.stadium_name === stadium.stadium_name
                                        ? "text-white"
                                        : "text-white/40 hover:text-white/70"
                                        }`}
                                >
                                    {stadium.stadium_name}
                                    {selectedStadium?.stadium_name === stadium.stadium_name && (
                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {
                        stats && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                                <div>
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                        Promedio
                                    </div>
                                    <div className="text-2xl font-bold">
                                        ~ {formatNumber(stats.avg)}
                                    </div>
                                    <div className="text-[10px] text-white/50 mt-1">espectadores</div>
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                        Ocupación
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {stats.avgOcc.toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                        Máximo
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {formatNumber(stats.max)}
                                    </div>
                                    <div className="text-[10px] text-white/50 mt-1 leading-tight">
                                        vs {stats.maxMatch?.away_team} ({stats.maxMatch?.home_goals}-{stats.maxMatch?.away_goals})
                                        <br />
                                        {stats.maxMatch?.date && (() => {
                                            const date = stats.maxMatch?.localDateTime ? new Date(stats.maxMatch.localDateTime) : buildMatchDateTime(stats.maxMatch.date, stats.maxMatch.time, stats.maxMatch, stadiums, fullStadiumData);
                                            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
                                            const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                                            const timeWithoutSeconds = stats.maxMatch?.localTime || formatAdjustedTime(stats.maxMatch, stadiums, fullStadiumData) || stats.maxMatch.time?.substring(0, 5) || '';
                                            return `${capitalizedDay}, ${timeWithoutSeconds}`;
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                        Mínimo
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {formatNumber(stats.min)}
                                    </div>
                                    <div className="text-[10px] text-white/50 mt-1 leading-tight">
                                        vs {stats.minMatch?.away_team} ({stats.minMatch?.home_goals}-{stats.minMatch?.away_goals})
                                        <br />
                                        {stats.minMatch?.date && (() => {
                                            const date = stats.minMatch?.localDateTime ? new Date(stats.minMatch.localDateTime) : buildMatchDateTime(stats.minMatch.date, stats.minMatch.time, stats.minMatch, stadiums, fullStadiumData);
                                            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
                                            const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                                            const timeWithoutSeconds = stats.minMatch?.localTime || formatAdjustedTime(stats.minMatch, stadiums, fullStadiumData) || stats.minMatch.time?.substring(0, 5) || '';
                                            return `${capitalizedDay}, ${timeWithoutSeconds}`;
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                        PARTIDOS EN CASA
                                    </div>
                                    <div className="text-2xl font-bold">{formatNumber(stats.total)}</div>
                                </div>
                            </div>
                        )
                    }
                </div >

                {/* Charts */}
                < div className="space-y-12" >
                    {/* Row 1: Evolution (Left) & Matches Panel (Right) */}
                    < div className="grid grid-cols-1 lg:grid-cols-3 gap-8" >
                        {/* Evolución temporal (2/3) */}
                        < div className="lg:col-span-2" id="chart-evolucion-temporal" >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                                <h2 className="text-lg font-bold">Evolución temporal</h2>
                                <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                                    <div className="flex bg-white/10 rounded-lg p-0.5 mr-0 sm:mr-2 w-full sm:w-auto justify-between sm:justify-start">
                                        <button
                                            onClick={() => setEvolutionMetric("attendance")}
                                            className={`px-2 py-1 text-[10px] rounded-md transition-colors flex-1 sm:flex-none text-center ${evolutionMetric === "attendance" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
                                        >
                                            Asistencia
                                        </button>
                                        <button
                                            onClick={() => setEvolutionMetric("occupancy")}
                                            className={`px-2 py-1 text-[10px] rounded-md transition-colors flex-1 sm:flex-none text-center ${evolutionMetric === "occupancy" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
                                        >
                                            % Ocupación
                                        </button>
                                    </div>

                                    <select
                                        value={timeSeriesComparison}
                                        onChange={(e) => setTimeSeriesComparison(e.target.value)}
                                        className="bg-black/60 border border-white/15 text-xs px-2 py-1 rounded-md text-white/80 outline-none w-full sm:w-auto max-w-[160px]"
                                    >
                                        <option value="">Sin comparativa</option>
                                        {comparisonOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    {/* Download removed per request */}
                                </div>
                            </div>
                            <p className="text-sm text-white/50 mb-6">
                                {evolutionMetric === "attendance"
                                    ? "Asistencia por jornada con intervalo de confianza (±1σ)"
                                    : "Porcentaje de ocupación del estadio por jornada"}
                            </p>
                            <ResponsiveContainer width="100%" height={350}>
                                <ComposedChart data={timeSeriesData}>
                                    <defs>
                                        <linearGradient
                                            id="colorAsistencia"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#06b6d4"
                                                stopOpacity={0.4}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#06b6d4"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                        <linearGradient
                                            id="colorBanda"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#8b5cf6"
                                                stopOpacity={0.15}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#8b5cf6"
                                                stopOpacity={0.05}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#ffffff08"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="jornada"
                                        stroke="#ffffff30"
                                        tick={{ fill: "#ffffff50", fontSize: 11 }}
                                        tickLine={false}
                                        label={{
                                            value: "Jornada",
                                            position: "insideBottom",
                                            offset: -5,
                                            fill: "#ffffff40",
                                            fontSize: 11,
                                        }}
                                    />
                                    <YAxis
                                        stroke="#ffffff30"
                                        tick={{ fill: "#ffffff50", fontSize: 11 }}
                                        tickLine={false}
                                        tickFormatter={(value) => evolutionMetric === "attendance" ? formatNumber(value) : `${value}%`}
                                        domain={evolutionMetric === "attendance" ? ['auto', 'auto'] : [0, 100]}
                                    />
                                    <Tooltip content={<EvolutionTooltip />} />
                                    {evolutionMetric === "attendance" && (
                                        <ReferenceLine
                                            y={teamStadium?.capacity}
                                            stroke="#ffffff"
                                            strokeOpacity={0.2}
                                            strokeDasharray="3 3"
                                            label={{ value: "Capacidad", position: "insideTopRight", fill: "#ffffff50", fontSize: 10 }}
                                        />
                                    )}
                                    {evolutionMetric === "attendance" && timeSeriesComparison && (
                                        <ReferenceLine
                                            y={fullStadiumData.find(s => getTeamDisplayName(s.team_primary || "") === timeSeriesComparison)?.capacity}
                                            stroke="#f59e0b"
                                            strokeOpacity={0.2}
                                            strokeDasharray="3 3"
                                            label={{ value: "Capacidad Rival", position: "insideTopRight", fill: "#f59e0b", fontSize: 10 }}
                                        />
                                    )}
                                    {evolutionMetric === "attendance" && (
                                        <>
                                            <Area
                                                type="linear"
                                                dataKey="upperBand"
                                                fill="url(#colorBanda)"
                                                stroke="none"
                                                fillOpacity={1}
                                                name="Banda superior"
                                                connectNulls={true}
                                            />
                                            <Area
                                                type="linear"
                                                dataKey="lowerBand"
                                                fill="url(#colorBanda)"
                                                stroke="none"
                                                fillOpacity={1}
                                                name="Banda inferior"
                                                connectNulls={true}
                                            />
                                        </>
                                    )}
                                    <Area
                                        type="linear"
                                        dataKey="value"
                                        fill="url(#colorAsistencia)"
                                        stroke="#06b6d4"
                                        strokeWidth={2}
                                        name={evolutionMetric === "attendance" ? "Asistencia" : "Ocupación"}
                                        connectNulls={true}
                                    />
                                    {/* Add visible points for each jornada */}
                                    <Line
                                        type="linear"
                                        dataKey="value"
                                        stroke="#06b6d4"
                                        strokeWidth={0}
                                        dot={{ r: 4, stroke: '#0b1220', strokeWidth: 1, fill: '#06b6d4' }}
                                        activeDot={{ r: 5 }}
                                        connectNulls={true}
                                    />
                                    {timeSeriesComparison && (
                                        <Area
                                            type="linear"
                                            dataKey="comparison"
                                            stroke="#f59e0b"
                                            strokeWidth={2}
                                            fill="none"
                                            name={comparisonOptions.find(o => o.value === timeSeriesComparison)?.label || "Comparativa"}
                                            strokeDasharray="5 5"
                                            connectNulls={true}
                                        />
                                    )}
                                    {timeSeriesComparison && (
                                        <Line
                                            type="linear"
                                            dataKey="comparison"
                                            stroke="#f59e0b"
                                            strokeWidth={0}
                                            dot={{ r: 3, stroke: '#0b1220', strokeWidth: 1, fill: '#f59e0b' }}
                                            connectNulls={true}
                                        />
                                    )}
                                    <CartesianGrid />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div >

                        {/* Matches List Panel (1/3) */}
                        < div className="lg:col-span-1 rounded-xl p-4 flex flex-col h-[450px]" >
                            <h2 className="text-lg font-bold mb-4 sticky top-0 z-10 bg-transparent">Partidos en casa</h2>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                {homeMatches.map((match, index) => (
                                    <div key={index} className="rounded-lg p-3 hover:bg-white/10 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-white/40 font-mono">
                                                    {formatAdjustedDate(match, stadiums, fullStadiumData)}
                                                </span>
                                                <span className="text-[10px] text-white/30">
                                                    {match.localTime || match.time}
                                                </span>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/10 text-white/70">
                                                J{match.spieltag}
                                            </span>
                                        </div>
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
                                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                                            {(() => {
                                                const occ = match.occupancyPct ?? 0;
                                                return (
                                                    <>
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] text-white/50">
                                                                {formatNumber(match.attendance || 0)} esp.
                                                            </span>
                                                            <span className={`text-[10px] font-mono font-bold ${occ > 80 ? "text-green-400" : occ > 60 ? "text-cyan-400" : "text-amber-400"}`}>
                                                                {occ.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${occ > 80 ? "bg-green-500" : occ > 60 ? "bg-cyan-500" : "bg-amber-500"}`}
                                                                style={{ width: `${Math.min(occ, 100)}%` }}
                                                            />
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div >
                    </div >

                    {/* Row 2: Scatter (Left) & Radar (Right) */}
                    < div className="grid grid-cols-1 lg:grid-cols-2 gap-8" >
                        {/* Scatter asistencia vs ocupación */}
                        < div id="chart-scatter-asistencia" >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                                <h2 className="text-lg font-bold">
                                    Relación entre asistencia y ocupación
                                </h2>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:justify-end">
                                    <select
                                        value={scatterComparison}
                                        onChange={(e) => setScatterComparison(e.target.value)}
                                        className="bg-black/60 border border-white/15 text-xs px-2 py-1 rounded-md text-white/80 outline-none w-full sm:w-auto max-w-[160px]"
                                    >
                                        <option value="">Sin comparativa</option>
                                        {comparisonOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    {/* Download removed per request */}
                                </div>
                            </div>
                            <p className="text-sm text-white/50 mb-6">
                                Correlación entre asistencia absoluta y porcentaje de
                                ocupación
                            </p>
                            <ResponsiveContainer width="100%" height={350}>
                                <ScatterChart
                                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#ffffff08"
                                    />
                                    <XAxis
                                        type="number"
                                        dataKey="x"
                                        name="Asistencia"
                                        stroke="#ffffff30"
                                        tick={{ fill: "#ffffff50", fontSize: 11 }}
                                        tickLine={false}
                                        tickFormatter={(value) => formatNumber(value)}
                                        domain={[0, scatterMaxX]}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="y"
                                        name="Ocupación"
                                        stroke="#ffffff30"
                                        tick={{ fill: "#ffffff50", fontSize: 11 }}
                                        tickLine={false}
                                        tickFormatter={(value) =>
                                            `${value.toFixed(0)}%`
                                        }
                                    />
                                    <Tooltip
                                        content={<ScatterTooltip />}
                                        cursor={{ strokeDasharray: "3 3" }}
                                    />
                                    {/* Reference Lines for averages: base team (green) and optional comparison (orange) */}
                                    {stats && (
                                        <>
                                            {/* base team's averages (same color for both lines) */}
                                            <ReferenceLine x={stats.avg} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Asistencia promedio", position: "insideTopRight", fill: "#10b981", fontSize: 10 }} />
                                            <ReferenceLine y={stats.avgOcc} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Ocupación promedio", position: "insideTopRight", fill: "#10b981", fontSize: 10 }} />
                                        </>
                                    )}

                                    {scatterComparison && scatterComparisonStats && (
                                        <>
                                            {/* comparison group's averages (same color for both lines) */}
                                            <ReferenceLine x={scatterComparisonStats.avg} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `${comparisonOptions.find(o => o.value === scatterComparison)?.label || scatterComparison}`, position: "insideTopRight", fill: "#f59e0b", fontSize: 10 }} />
                                            <ReferenceLine y={scatterComparisonStats.avgOcc} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `${comparisonOptions.find(o => o.value === scatterComparison)?.label || scatterComparison}`, position: "insideTopRight", fill: "#f59e0b", fontSize: 10 }} />
                                        </>
                                    )}

                                    {/* Capacity Lines */}
                                    {teamStadium?.capacity && (
                                        <ReferenceLine
                                            x={teamStadium.capacity}
                                            stroke="#ffffff"
                                            strokeOpacity={0.2}
                                            strokeDasharray="3 3"
                                        />
                                    )}
                                    {scatterComparison &&
                                        !["__global__", "__primera__", "__segunda__"].includes(scatterComparison) && (
                                            <ReferenceLine
                                                x={fullStadiumData.find(s => getTeamDisplayName(s.team_primary || "") === scatterComparison)?.capacity}
                                                stroke="#f59e0b"
                                                strokeOpacity={0.2}
                                                strokeDasharray="3 3"
                                            />
                                        )}

                                    <Scatter
                                        name="Partidos"
                                        data={scatterData.filter(d => d.type === 'current')}
                                        fill="#10b981"
                                    >
                                        {scatterData.filter(d => d.type === 'current').map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#10b981"
                                                opacity={0.6}
                                            />
                                        ))}
                                    </Scatter>
                                    {scatterComparison && (
                                        <Scatter
                                            name={comparisonOptions.find(o => o.value === scatterComparison)?.label || "Comparativa"}
                                            data={scatterData.filter(d => d.type === 'comparison')}
                                            fill="#f59e0b"
                                        >
                                            {scatterData.filter(d => d.type === 'comparison').map((_, index) => (
                                                <Cell
                                                    key={`cell-comp-${index}`}
                                                    fill="#f59e0b"
                                                    opacity={0.3}
                                                />
                                            ))}
                                        </Scatter>
                                    )}
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div >

                        {/* Patrón semanal (Radar) */}
                        < div id="chart-patron-semanal" className="relative" >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                                <div>
                                    <h2 className="text-lg font-bold mb-1">Distribución semanal de asistencia</h2>
                                    <p className="text-sm text-white/50">
                                        {weeklyMetric === "attendance" ? "Asistencia" : "Ocupación"} promedio por día de la semana.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
                                    <div className="flex bg-white/10 rounded-lg p-0.5 w-full sm:w-auto justify-between sm:justify-start">
                                        <button
                                            onClick={() => setWeeklyMetric("attendance")}
                                            className={`px-2 py-1 text-[10px] rounded-md transition-colors flex-1 sm:flex-none text-center ${weeklyMetric === "attendance" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
                                        >
                                            Asistencia
                                        </button>
                                        <button
                                            onClick={() => setWeeklyMetric("occupancy")}
                                            className={`px-2 py-1 text-[10px] rounded-md transition-colors flex-1 sm:flex-none text-center ${weeklyMetric === "occupancy" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
                                        >
                                            % Ocupación
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <select
                                            value={comparisonTeam}
                                            onChange={(e) =>
                                                setComparisonTeam(e.target.value as string)
                                            }
                                            className="bg-black/60 border border-white/15 text-xs px-2 py-1 rounded-md text-white/80 outline-none w-full sm:w-auto max-w-[150px]"
                                        >
                                            <option value="">Sin comparativa</option>
                                            {comparisonOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        {/* Download removed per request */}
                                    </div>
                                </div>
                            </div>

                            <ResponsiveContainer width="100%" height={350}>
                                <RadarChart data={combinedWeeklyRadarData}>
                                    <PolarGrid stroke="#ffffff15" />
                                    <PolarAngleAxis
                                        dataKey="dia"
                                        tick={{ fill: "#ffffff50", fontSize: 11 }}
                                    />
                                    <PolarRadiusAxis
                                        angle={90}
                                        tick={{ fill: "#ffffff40", fontSize: 11, dy: 4 }}
                                        stroke="#ffffff20"
                                        tickFormatter={(value) =>
                                            weeklyMetric === "attendance"
                                                ? formatNumber(value)
                                                : `${value.toFixed(0)}%`
                                        }
                                    />
                                    <Radar
                                        name={weeklyMetric === "attendance" ? "Asistencia promedio" : "Ocupación promedio"}
                                        dataKey="base"
                                        stroke="#f59e0b"
                                        fill="#f59e0b"
                                        fillOpacity={0.35}
                                        strokeWidth={2}
                                    />
                                    {comparisonTeam && (
                                        <Radar
                                            name={comparisonTeam}
                                            dataKey="comparison"
                                            stroke="#06b6d4"
                                            fill="#06b6d4"
                                            fillOpacity={0.25}
                                            strokeWidth={2}
                                        />
                                    )}
                                    {weeklyMetric === "attendance" && (
                                        <Radar
                                            name="Capacidad"
                                            dataKey="capacity"
                                            stroke="#ffffff"
                                            strokeOpacity={0.2}
                                            fill="none"
                                            strokeDasharray="3 3"
                                        />
                                    )}
                                    {weeklyMetric === "attendance" && comparisonTeam && (
                                        <Radar
                                            name={`Capacidad ${comparisonTeam}`}
                                            dataKey="rivalCapacity"
                                            stroke="#06b6d4"
                                            strokeOpacity={0.2}
                                            fill="none"
                                            strokeDasharray="3 3"
                                        />
                                    )}
                                    <Tooltip content={<RadarTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div >
                    </div >

                    {/* Grid de gráficos restantes */}
                    < div className="grid grid-cols-1 lg:grid-cols-2 gap-12" >


                        {/* Distribución de ocupación */}
                        < div id="chart-distribucion-ocupacion" >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                                <div>
                                    <h2 className="text-lg font-bold">
                                        Distribución de ocupación
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <select
                                        value={densityComparison}
                                        onChange={(e) => setDensityComparison(e.target.value)}
                                        className="bg-black/60 border border-white/15 text-xs px-2 py-1 rounded-md text-white/80 outline-none w-full sm:w-auto max-w-[150px]"
                                    >
                                        <option value="">Sin comparativa</option>
                                        {comparisonOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    {/* Download removed per request */}
                                </div>
                            </div>
                            <p className="text-sm text-white/50 mb-6">
                                Frecuencia relativa de partidos por rango de ocupación
                            </p>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart
                                    data={densityData}
                                    barGap={0}
                                    barCategoryGap="10%"
                                    margin={{ top: 12, left: 6, right: 10, bottom: 90 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis
                                        dataKey="range"
                                        stroke="#ffffff30"
                                        tick={{ fill: "#ffffff50", fontSize: 11, dy: 10 }}
                                        tickLine={false}
                                        interval={0}
                                        tickMargin={12}
                                        angle={-70}
                                        textAnchor="end"
                                    />
                                    <YAxis
                                        stroke="#ffffff30"
                                        tick={{ fill: "#ffffff50", fontSize: 11 }}
                                        tickLine={false}
                                        tickFormatter={(value) => `${value}%`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload || !payload.length) return null;
                                            const data = payload[0].payload;
                                            const rangeLabel = `${data.min}-${data.max}%`;
                                            return (
                                                <div className="bg-black/95 border border-white/20 px-3 py-2.5 rounded-lg text-xs space-y-2 max-w-[250px]">
                                                    <div className="font-bold text-white mb-1">Rango: {rangeLabel}</div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span style={{ color: payload[0].color }}>{teamName}</span>
                                                        <span className="font-mono">{data.freq.toFixed(1)}% ({data.count} partidos)</span>
                                                    </div>
                                                    {densityComparison && payload[1] && (
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span style={{ color: payload[1].color }}>
                                                                {comparisonOptions.find(o => o.value === densityComparison)?.label || "Comparativa"}
                                                            </span>
                                                            <span className="font-mono">{data.compFreq.toFixed(1)}%</span>
                                                        </div>
                                                    )}
                                                    {data.partidos.length > 0 && (
                                                        <div className="pt-2 border-t border-white/10 mt-2">
                                                            <div className="text-white/50 mb-1">Partidos en este rango:</div>
                                                            <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                                {data.partidos.map((p: any, i: number) => (
                                                                    <div key={i} className="flex justify-between text-[10px] text-white/70">
                                                                        <span>J{p.jornada} vs {p.rival}</span>
                                                                        <span className="font-mono text-white/90">{p.ocupacion.toFixed(1)}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar dataKey="freq" name={teamName} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    {densityComparison && (
                                        <Bar
                                            dataKey="compFreq"
                                            name={comparisonOptions.find(o => o.value === densityComparison)?.label || "Comparativa"}
                                            fill="#f59e0b"
                                            radius={[4, 4, 0, 0]}
                                            opacity={0.7}
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div >

                        {/* Impacto como visitante: dot-plot por rival */}
                        {
                            awayRivalImpact.length > 0 && (
                                <div id="chart-impacto-visitante" className="relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-lg font-bold">
                                            Impacto como visitante
                                        </h2>
                                        {/* Download removed per request */}
                                    </div>
                                    <p className="text-sm text-white/50 mb-6">
                                        Ocupación media de los estadios rivales en partidos como visitante.
                                        <span className="inline-flex items-center gap-2 text-xs text-white/40 ml-4">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2 6h8m-4-4l4 4-4 4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span>supera media local</span>
                                            <span className="text-white/20">|</span>
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10 6H2m4-4l-4 4 4 4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span>por debajo media local</span>
                                        </span>
                                    </p>
                                    <ResponsiveContainer
                                        width="100%"
                                        height={Math.max(
                                            280,
                                            awayRivalImpact.length * 24 + 80
                                        )}
                                    >
                                        <ScatterChart
                                            layout="horizontal"
                                            margin={{
                                                top: 16,
                                                right: isMobile ? 16 : 48,
                                                bottom: isMobile ? 18 : 24,
                                                left: isMobile ? 44 : 92,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#ffffff08"
                                                horizontal
                                                vertical={false}
                                            />
                                            <XAxis
                                                type="number"
                                                dataKey="avgOcc"
                                                name="Ocupación media"
                                                domain={[0, 100]}
                                                stroke="#ffffff30"
                                                tick={{ fill: "#ffffff50", fontSize: 11 }}
                                                tickLine={false}
                                                tickFormatter={(v) => `${v.toFixed(0)}%`}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="rival"
                                                stroke="#ffffff30"
                                                tick={{ fill: "#ffffff70", fontSize: 11 }}
                                                tickLine={false}
                                                width={isMobile ? 68 : 100}
                                            />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload || !payload.length)
                                                        return null;
                                                    const d = payload[0].payload as any;
                                                    return (
                                                        <div className="bg-black/95 border border-white/20 px-3 py-2.5 rounded-lg text-xs space-y-1">
                                                            <div className="font-medium text-white/80">
                                                                {d.rival}
                                                            </div>
                                                            <div className="text-white/60">
                                                                Ocupación:{" "}
                                                                <span className="font-semibold">
                                                                    {d.avgOcc.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div className="text-white/40">
                                                                Media local: {d.rivalMediaLocal.toFixed(1)}%
                                                            </div>
                                                            <div className="text-white/40">
                                                                Día: {d.dayOfWeek}
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Scatter
                                                data={awayRivalImpact}
                                                name="Rivales"
                                                shape={(props: any) => renderImpactPoint(props) as any}
                                            />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            )
                        }
                    </div >

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-white/10 mt-8">
                        {/* Heat-maps: Ocupación y Frecuencia (dos heatmaps sincronizados) */}
                        {occupancyHeatmapData && occupancyHeatmapData.cells && occupancyHeatmapData.cells.length > 0 && (
                            <div id="chart-heatmaps-hora-dia" className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-lg font-bold">Ocupación por hora y día</h2>
                                    <div className="flex items-center gap-3">
                                        {/* Download removed per request */}
                                    </div>
                                </div>

                                <p className="text-sm text-white/50 mb-6">Comparativa de ocupación media y volumen de partidos por franja horaria.</p>

                                <div className="flex justify-center">
                                    <div className="w-full max-w-6xl">
                                        {/* container for both heatmaps: side-by-side */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                            {/* Heatmap 1 — ocupación media (integrated with page background) */}
                                            <div className="rounded-md p-2">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h3 className="text-sm font-semibold">Ocupación media por hora y día</h3>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 items-start">
                                                    {/* Left column: hours */}
                                                    <div className="flex flex-col gap-1 w-10 mr-2">
                                                        <div className="h-6" />
                                                        {occupancyHeatmapData.hours.map((h: number) => (
                                                            <div key={`label1-${h}`} className="h-10 text-xs text-white/50 flex items-center justify-end pr-2 w-10">
                                                                {String(h).padStart(2, '0')}h
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Grid */}
                                                    <div className="flex-1">
                                                        <div className="flex gap-1 pb-2">
                                                            {occupancyHeatmapData.days.map((d: any, dayIdx: number) => (
                                                                <div key={`d1-${dayIdx}`} className="w-12 text-center text-xs text-white/50 font-semibold">
                                                                    {d.name.substring(0, 3)}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {occupancyHeatmapData.hours.map((hour: number) => (
                                                            <div key={`row1-${hour}`} className="flex gap-1 mb-1">
                                                                {occupancyHeatmapData.days.map((d: any, dayIdx: number) => {
                                                                    const cell = occupancyHeatmapData.cells.find((c: any) => c.dayIdx === d.idx && c.hour === hour);
                                                                    const value = cell?.value ?? 0;
                                                                    const has = (cell?.count ?? 0) > 0;
                                                                    const bg = has ? getColorForOccupancy(value) : '#0f1720';
                                                                    return (
                                                                        <div
                                                                            key={`c1-${dayIdx}-${hour}`}
                                                                            className={`w-12 h-10 rounded-md border border-white/5 transition-all cursor-pointer hover:ring-2 hover:ring-white/20 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-md`}
                                                                            style={{ background: bg }}
                                                                            onMouseEnter={(e) => {
                                                                                const padding = 8;
                                                                                const vw = window.innerWidth;
                                                                                const vh = window.innerHeight;
                                                                                let left = e.clientX + padding;
                                                                                let top = e.clientY + padding;
                                                                                const estW = 320; const estH = 240;
                                                                                if (left + estW > vw) left = Math.max(padding, vw - estW - 12);
                                                                                if (top + estH > vh) top = Math.max(padding, vh - estH - 12);
                                                                                setHeatmapTooltip({ visible: true, left, top, matches: cell?.matches || [], title: `${d.name} ${String(hour).padStart(2, '0')}:00` });
                                                                            }}
                                                                            onMouseMove={(e) => {
                                                                                const padding = 8;
                                                                                const vw = window.innerWidth;
                                                                                const vh = window.innerHeight;
                                                                                let left = e.clientX + padding;
                                                                                let top = e.clientY + padding;
                                                                                const estW = 320; const estH = 240;
                                                                                if (left + estW > vw) left = Math.max(padding, vw - estW - 12);
                                                                                if (top + estH > vh) top = Math.max(padding, vh - estH - 12);
                                                                                setHeatmapTooltip((s) => ({ ...s, left, top }));
                                                                            }}
                                                                            onMouseLeave={() => setHeatmapTooltip({ visible: false, left: 0, top: 0, matches: [], title: '' })}
                                                                        >
                                                                            {has ? value.toFixed(2) : ""}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Legend for occupancy */}
                                                    <div className="flex flex-col justify-start gap-2 border-l border-white/10 pl-3 ml-2 h-full py-4 w-24">
                                                        <div className="text-xs text-white/50 font-semibold mb-1">Ocupación</div>
                                                        <div className="h-24 w-4 rounded-full relative" style={{ background: 'linear-gradient(to bottom, #22c55e, #f59e0b, #ef4444)' }}>
                                                            <div className="absolute -right-8 top-0 text-[10px] text-white/60">100%</div>
                                                            <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-[10px] text-white/60">50%</div>
                                                            <div className="absolute -right-8 bottom-0 text-[10px] text-white/60">0%</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Heatmap 2 — frecuencia (integrated with page background) */}
                                            <div className="rounded-md p-2">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h3 className="text-sm font-semibold">Frecuencia de partidos por hora y día</h3>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 items-start">
                                                    {/* Left hours */}
                                                    <div className="flex flex-col gap-1 w-10 mr-2">
                                                        <div className="h-6" />
                                                        {occupancyHeatmapData.hours.map((h: number) => (
                                                            <div key={`label2-${h}`} className="h-10 text-xs text-white/50 flex items-center justify-end pr-2 w-10">
                                                                {String(h).padStart(2, '0')}h
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Grid */}
                                                    <div className="flex-1">
                                                        <div className="flex gap-1 pb-2">
                                                            {occupancyHeatmapData.days.map((d: any, dayIdx: number) => (
                                                                <div key={`d2-${dayIdx}`} className="w-12 text-center text-xs text-white/50 font-semibold">
                                                                    {d.name.substring(0, 3)}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {occupancyHeatmapData.hours.map((hour: number) => (
                                                            <div key={`row2-${hour}`} className="flex gap-1 mb-1">
                                                                {occupancyHeatmapData.days.map((d: any, dayIdx: number) => {
                                                                    const cell = occupancyHeatmapData.cells.find((c: any) => c.dayIdx === d.idx && c.hour === hour);
                                                                    const count = cell?.count ?? 0;
                                                                    const max = occupancyHeatmapData.maxCount || 1;
                                                                    const freqPct = max > 0 ? (count / max) * 100 : 0;
                                                                    const has = count > 0;
                                                                    const bg = has ? getColorForFrequency(freqPct) : '#0f1720';
                                                                    return (
                                                                        <div
                                                                            key={`c2-${dayIdx}-${hour}`}
                                                                            className={`w-12 h-10 rounded-md border border-white/5 transition-all cursor-pointer hover:ring-2 hover:ring-white/20 flex items-center justify-center text-[10px] font-bold text-white drop-shadow`}
                                                                            style={{ background: bg }}
                                                                            onMouseEnter={(e) => {
                                                                                const padding = 8; const vw = window.innerWidth; const vh = window.innerHeight;
                                                                                let left = e.clientX + padding; let top = e.clientY + padding; const estW = 320; const estH = 240;
                                                                                if (left + estW > vw) left = Math.max(padding, vw - estW - 12);
                                                                                if (top + estH > vh) top = Math.max(padding, vh - estH - 12);
                                                                                setHeatmapTooltip({ visible: true, left, top, matches: cell?.matches || [], title: `${d.name} ${String(hour).padStart(2, '0')}:00` });
                                                                            }}
                                                                            onMouseMove={(e) => {
                                                                                const padding = 8; const vw = window.innerWidth; const vh = window.innerHeight;
                                                                                let left = e.clientX + padding; let top = e.clientY + padding; const estW = 320; const estH = 240;
                                                                                if (left + estW > vw) left = Math.max(padding, vw - estW - 12);
                                                                                if (top + estH > vh) top = Math.max(padding, vh - estH - 12);
                                                                                setHeatmapTooltip((s) => ({ ...s, left, top }));
                                                                            }}
                                                                            onMouseLeave={() => setHeatmapTooltip({ visible: false, left: 0, top: 0, matches: [], title: '' })}
                                                                        >
                                                                            {has ? count : ""}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Legend for frequency */}
                                                    <div className="flex flex-col justify-start gap-2 border-l border-white/10 pl-3 ml-2 h-full py-4 w-32">
                                                        <div className="text-xs text-white/50 font-semibold mb-1">Frecuencia</div>
                                                        <div className="h-24 w-4 rounded-full relative" style={{ background: 'linear-gradient(to bottom, #34d399, #f59e0b, #ef4444)' }}>
                                                            <div className="absolute left-6 top-0 text-[10px] text-white/60 whitespace-nowrap">Más partidos</div>
                                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] text-white/60 whitespace-nowrap">Medio</div>
                                                            <div className="absolute left-6 bottom-0 text-[10px] text-white/60 whitespace-nowrap">Menos partidos</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tooltip (fixed) reused for both heatmaps — content already handles matches/title */}
                                {heatmapTooltip.visible && (
                                    <div className="z-50" style={{ position: 'fixed', left: heatmapTooltip.left, top: heatmapTooltip.top }}>
                                        <div className="bg-black/95 border border-white/20 px-3 py-2.5 rounded-lg text-xs space-y-2 max-w-xs">
                                            <div className="font-medium text-white/80">{heatmapTooltip.title}</div>
                                            <div className="text-white/60 text-[11px]">Partidos: {heatmapTooltip.matches?.length || 0}</div>
                                            {heatmapTooltip.matches && heatmapTooltip.matches.length > 0 ? (
                                                <div className="text-white/60 space-y-1">
                                                    {heatmapTooltip.matches.map((m: any, i: number) => (
                                                        <div key={i} className="whitespace-nowrap">
                                                            J{m.jornada} {m.fecha} {m.hora} - vs {m.rival}: {m.ocupacion.toFixed(1)}%
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-white/50">Sin partidos</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* (removed duplicate/incorrect nested `Penetración de mercado` block here — kept the later correct version) */}

                        {/* Penetración de mercado */}
                        {
                            populationContext && (
                                <div>
                                    <h2 className="text-lg font-bold mb-2">
                                        Asistencia relativa a la población
                                    </h2>
                                    <p className="text-sm text-white/50 mb-6">
                                        Asistencia promedio como porcentaje de la población del
                                        territorio
                                    </p>
                                    <div className="space-y-6">
                                        {populationContext.municipal && (
                                            <div>
                                                <div className="flex justify-between items-baseline mb-2">
                                                    <span className="text-sm text-white/60">
                                                        {teamStadium?.municipality || 'Municipal'}
                                                    </span>
                                                    <span className="text-sm font-mono font-bold text-cyan-400">
                                                        {populationContext.municipal.penetration.toFixed(
                                                            3
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-cyan-500 rounded-full"
                                                        style={{
                                                            width: `${Math.min(
                                                                populationContext.municipal.penetration,
                                                                100
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs text-white/40 mt-2">
                                                    {formatNumber(Math.round(stats?.avg || 0))}{" "}
                                                    /{" "}
                                                    {formatNumber(populationContext.municipal.population)}{" "}
                                                    hab.
                                                </div>
                                            </div>
                                        )}

                                        {populationContext.provincial && (
                                            <div>
                                                <div className="flex justify-between items-baseline mb-2">
                                                    <span className="text-sm text-white/60">
                                                        {teamStadium?.province || 'Provincial'}
                                                    </span>
                                                    <span className="text-sm font-mono font-bold text-purple-400">
                                                        {populationContext.provincial.penetration.toFixed(
                                                            4
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full"
                                                        style={{
                                                            width: `${Math.min(
                                                                populationContext.provincial.penetration,
                                                                100
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs text-white/40 mt-2">
                                                    {formatNumber(Math.round(stats?.avg || 0))}{" "}
                                                    /{" "}
                                                    {formatNumber(populationContext.provincial.population)}{" "}
                                                    hab.
                                                </div>
                                            </div>
                                        )}

                                        {populationContext.autonomic && (
                                            <div>
                                                <div className="flex justify-between items-baseline mb-2">
                                                    <span className="text-sm text-white/60">
                                                        {teamStadium?.ccaa || 'Autonómico'}
                                                    </span>
                                                    <span className="text-sm font-mono font-bold text-amber-400">
                                                        {populationContext.autonomic.penetration.toFixed(
                                                            4
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-500 rounded-full"
                                                        style={{
                                                            width: `${Math.min(
                                                                populationContext.autonomic.penetration,
                                                                100
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs text-white/40 mt-2">
                                                    {formatNumber(Math.round(stats?.avg || 0))}{" "}
                                                    /{" "}
                                                    {formatNumber(populationContext.autonomic.population)}{" "}
                                                    hab.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                    </div >


                </div >
            </div >
        </div >
    );
}
