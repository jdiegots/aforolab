"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

type Stadium = {
    stadium_name: string;
    team_primary?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches: number;
};

export function RadialBurst({ data }: { data: Stadium[] }) {
    const [hovered, setHovered] = useState<Stadium | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 800 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const size = Math.min(containerRef.current.offsetWidth, 800);
                setDimensions({ width: size, height: size });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;

    // Sort by occupancy for better visual
    const sortedData = [...data].sort((a, b) => b.occ_avg_pct - a.occ_avg_pct);

    const getColor = (occ: number) => {
        if (occ >= 90) return "#06b6d4"; // cyan-500
        if (occ >= 80) return "#22d3ee"; // cyan-400
        if (occ >= 70) return "#67e8f9"; // cyan-300
        if (occ >= 60) return "#a5f3fc"; // cyan-200
        return "rgba(255, 255, 255, 0.3)";
    };

    return (
        <div ref={containerRef} className="relative w-full flex items-center justify-center">
            <svg width={width} height={height} className="overflow-visible">
                {/* Center circle */}
                <circle
                    cx={centerX}
                    cy={centerY}
                    r={30}
                    fill="url(#centerGradient)"
                    className="drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                />

                <defs>
                    <radialGradient id="centerGradient">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#2563eb" />
                    </radialGradient>
                </defs>

                {/* Rays */}
                {sortedData.map((stadium, index) => {
                    const angle = (index / sortedData.length) * 2 * Math.PI - Math.PI / 2;
                    const rayLength = (stadium.occ_avg_pct / 100) * maxRadius;
                    const endX = centerX + Math.cos(angle) * rayLength;
                    const endY = centerY + Math.sin(angle) * rayLength;

                    // Stroke width based on capacity
                    const maxCapacity = Math.max(...data.map(d => d.capacity));
                    const strokeWidth = 1 + (stadium.capacity / maxCapacity) * 8;

                    const isHovered = hovered?.stadium_name === stadium.stadium_name;

                    return (
                        <g key={stadium.stadium_name}>
                            {/* Ray line */}
                            <motion.line
                                x1={centerX}
                                y1={centerY}
                                x2={endX}
                                y2={endY}
                                stroke={getColor(stadium.occ_avg_pct)}
                                strokeWidth={isHovered ? strokeWidth * 1.5 : strokeWidth}
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: isHovered ? 1 : 0.7 }}
                                transition={{
                                    duration: 1.5,
                                    delay: index * 0.02,
                                    ease: "easeOut"
                                }}
                                className="transition-all duration-300"
                                style={{
                                    filter: isHovered ? `drop-shadow(0 0 8px ${getColor(stadium.occ_avg_pct)})` : "none"
                                }}
                            />

                            {/* End point */}
                            <motion.circle
                                cx={endX}
                                cy={endY}
                                r={isHovered ? 6 : 4}
                                fill={getColor(stadium.occ_avg_pct)}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    duration: 0.5,
                                    delay: 1 + index * 0.02
                                }}
                                onMouseEnter={() => setHovered(stadium)}
                                onMouseLeave={() => setHovered(null)}
                                className="cursor-pointer transition-all"
                                style={{
                                    filter: isHovered ? `drop-shadow(0 0 12px ${getColor(stadium.occ_avg_pct)})` : "none"
                                }}
                            />
                        </g>
                    );
                })}

                {/* Center text */}
                <text
                    x={centerX}
                    y={centerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-bold fill-white uppercase tracking-widest"
                >
                    España
                </text>
            </svg>

            {/* Tooltip */}
            {hovered && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-4 left-4 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[220px] shadow-2xl z-50"
                >
                    <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                        {hovered.stadium_name}
                    </div>
                    <div className="text-lg font-bold text-white mb-3">
                        {hovered.team_primary}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <div className="text-white/50 text-xs mb-1">Ocupación</div>
                            <div className="text-cyan-400 font-bold text-lg">
                                {hovered.occ_avg_pct.toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-white/50 text-xs mb-1">Capacidad</div>
                            <div className="text-white font-mono text-sm">
                                {new Intl.NumberFormat("es-ES", { notation: "compact" }).format(hovered.capacity)}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 rounded-full bg-cyan-500" />
                    <span className="text-white/50">90%+ ocupación</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 rounded-full bg-cyan-400" />
                    <span className="text-white/50">80-90%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 rounded-full bg-cyan-300" />
                    <span className="text-white/50">70-80%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 rounded-full bg-white/30" />
                    <span className="text-white/50">&lt;70%</span>
                </div>
                <div className="text-white/30 text-[10px] mt-2">
                    • Longitud = Ocupación<br />
                    • Grosor = Capacidad
                </div>
            </div>
        </div>
    );
}
