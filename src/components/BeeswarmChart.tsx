"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import * as d3 from "d3-force";
import { scaleLinear, scaleSqrt } from "d3-scale";
import TeamInitialsBadge from "./TeamInitialsBadge";
import { getTeamDisplayName, getTeamSlug } from "@/utils/teamMappings";

type Stadium = {
    stadium_name: string;
    team_primary?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches: number;
};

type Node = Stadium & {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
};

function resolveTeamName(node: Stadium): string {
    const stadium = (node.stadium_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const baseTeam = (node.team_primary || "").trim();

    // Casos especiales Barça: tres estadios, mismo escudo
    const isBarcaStadium =
        stadium.includes("camp nou") ||
        stadium.includes("spotify camp nou") ||
        (stadium.includes("lluis") && stadium.includes("companys")) ||
        (stadium.includes("olimpic") && stadium.includes("lluis")) ||
        (stadium.includes("johan") && stadium.includes("cruyf"));

    if (isBarcaStadium) {
        return "FC Barcelona";
    }

    // Fallback general
    if (baseTeam !== "") return baseTeam;
    return "Unknown";
}

export function BeeswarmChart({ data }: { data: Stadium[] }) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [hovered, setHovered] = useState<Stadium | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });



    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                const height = Math.min(600, window.innerHeight * 0.6);
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    useEffect(() => {
        if (!data.length) return;

        let simulation: any = null;

        async function prepareAndRun() {
            const { width, height } = dimensions;
            const padding = 60;

            // Merge incoming data with full stadium dataset to ensure
            // stadiums present in `public/data/stadium_full_data.json` (e.g. Spotify Camp Nou)
            let mergedData = [...data];
            try {
                const res = await fetch('/data/stadium_full_data.json');
                if (res.ok) {
                    const full: Stadium[] = await res.json();
                    full.forEach((s) => {
                        const exists = mergedData.some(
                            (m) => (m.stadium_name || '').toLowerCase() === (s.stadium_name || '').toLowerCase()
                        );
                        if (!exists) {
                            mergedData.push({
                                stadium_name: s.stadium_name,
                                team_primary: s.team_primary,
                                capacity: s.capacity,
                                att_avg: s.att_avg ?? 0,
                                occ_avg_pct: s.occ_avg_pct ?? 0,
                                matches: (s as any).matches ?? 0,
                            });
                        }
                    });
                }
            } catch (e) {
                // If fetch fails, continue with provided data
            }

            const yScale = scaleLinear()
                .domain([0, 100])
                .range([height - padding, padding]);

            const radiusScale = scaleSqrt()
                .domain([0, Math.max(...mergedData.map((d) => d.capacity))])
                .range([3, 20]);

            const initialNodes: Node[] = mergedData.map((d) => ({
                ...d,
                x: Math.random() * (width - 2 * padding) + padding,
                y: yScale(d.occ_avg_pct),
            }));

            simulation = d3
                .forceSimulation(initialNodes)
                .force("x", d3.forceX(width / 2).strength(0.02))
                .force("y", d3.forceY((d: any) => yScale(d.occ_avg_pct)).strength(0.2))
                .force(
                    "collide",
                    d3.forceCollide((d: any) => radiusScale(d.capacity) + 2).strength(0.8)
                )
                .velocityDecay(0.5)
                .alphaDecay(0.01)
                .on("tick", () => {
                    setNodes([...initialNodes]);
                });
        }

        prepareAndRun();

        return () => {
            if (simulation) simulation.stop();
        };
    }, [data, dimensions]);

    const { width, height } = dimensions;
    const padding = 60;

    const radiusScale = scaleSqrt()
        .domain([0, Math.max(...data.map((d) => d.capacity))])
        .range([3, 20]);

    const yTicks = [0, 25, 50, 75, 100];

    return (
        <div ref={containerRef} className="relative w-full">
            <svg width={width} height={height} className="overflow-visible">
                <defs>
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: scale(0); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                </defs>

                {/* Y-axis grid lines */}
                {yTicks.map((tick) => {
                    const y = height - padding - ((tick / 100) * (height - 2 * padding));
                    return (
                        <g key={tick}>
                            <line
                                x1={padding}
                                x2={width - padding}
                                y1={y}
                                y2={y}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth={1}
                            />
                            <text
                                x={padding - 10}
                                y={y}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="text-xs fill-white/30 font-mono"
                            >
                                {tick}%
                            </text>
                        </g>
                    );
                })}

                {/* Nodes */}
                {nodes.map((node, i) => {
                    const r = radiusScale(node.capacity);
                    const logoSize = r * 1.6; // tamaño más pequeño que el círculo
                    const isHighOcc = node.occ_avg_pct > 85;
                    const isHovered = hovered?.stadium_name === node.stadium_name;
                    const logoTeamName = getTeamDisplayName(resolveTeamName(node));

                    return (
                        <g
                            key={node.stadium_name}
                            onMouseEnter={() => setHovered(node)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => setHovered(node)}
                            className="cursor-pointer transition-all"
                            style={{
                                filter: isHovered
                                    ? "drop-shadow(0 0 10px rgba(6,182,212,0.8))"
                                    : isHighOcc
                                        ? "drop-shadow(0 0 6px rgba(6,182,212,0.4))"
                                        : "none",
                            }}
                        >
                            {/* CÍRCULO DE BASE */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={r}
                                fill="rgba(255,255,255,0.18)"
                                stroke={isHovered ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.15)"}
                                strokeWidth={isHovered ? 2.5 : 1.2}
                                style={{
                                    opacity: 0,
                                    animation: `fadeIn 0.5s ease-out ${i * 0.01}s forwards`,
                                }}
                            />

                            {/* ESCUDO DENTRO DEL CÍRCULO */}
                            <foreignObject
                                x={node.x - logoSize / 2}
                                y={node.y - logoSize / 2}
                                width={logoSize}
                                height={logoSize}
                                style={{
                                    opacity: 0,
                                    animation: `fadeIn 0.5s ease-out ${i * 0.01}s forwards`,
                                    pointerEvents: "none",
                                }}
                            >
                                <div className="flex items-center justify-center w-full h-full">
                                    <TeamInitialsBadge
                                        teamName={logoTeamName}
                                        size={logoSize}
                                        className="rounded-full"
                                    />
                                </div>
                            </foreignObject>
                        </g>
                    );
                })}
            </svg>

            {/* Hover tooltip */}
            {hovered && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 w-[min(360px,90vw)] sm:w-[320px] shadow-2xl z-50"
                >
                    <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                        {hovered.stadium_name}
                    </div>
                    <div className="text-lg font-bold text-white mb-3">
                        {resolveTeamName(hovered)}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <div className="text-white/50 text-xs mb-1">Ocupación</div>
                            <div className="text-cyan-400 font-bold text-lg">
                                {hovered.occ_avg_pct.toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-white/50 text-xs mb-1">Partidos</div>
                            <div className="text-white font-mono">{hovered.matches}</div>
                        </div>
                        <div>
                            <div className="text-white/50 text-xs mb-1">Asistencia</div>
                            <div className="text-white font-mono text-sm">
                                {new Intl.NumberFormat("es-ES").format(hovered.att_avg)}
                            </div>
                        </div>
                        <div>
                            <div className="text-white/50 text-xs mb-1">Capacidad</div>
                            <div className="text-white font-mono text-sm">
                                {new Intl.NumberFormat("es-ES").format(hovered.capacity)}
                            </div>
                        </div>
                    </div>
                    {(() => {
                        const slug = getTeamSlug(getTeamDisplayName(resolveTeamName(hovered)));
                        if (!slug) return null;
                        return (
                            <div className="pt-3 mt-2 border-t border-white/10">
                                <a
                                    href={`/equipo/${encodeURIComponent(slug)}`}
                                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                                >
                                    Ir a la página del equipo
                                </a>
                            </div>
                        );
                    })()}
                </motion.div>
            )}
        </div>
    );
}
