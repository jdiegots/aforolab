// src/components/JornadaOccupancyChart.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { JornadaData } from "@/utils/processMatchData";

interface JornadaOccupancyChartProps {
    data: {
        primera: JornadaData[];
        segunda: JornadaData[];
    };
    selectedDivision: "all" | "primera" | "segunda";
    onDivisionChange: (division: "all" | "primera" | "segunda") => void;
}

export const JornadaOccupancyChart: React.FC<JornadaOccupancyChartProps> = ({
    data,
    selectedDivision,
    onDivisionChange
}) => {
    const [hoveredPoint, setHoveredPoint] = useState<JornadaData | null>(null);

    if (data.primera.length === 0 && data.segunda.length === 0) {
        return null;
    }

    const displayData = selectedDivision === "all"
        ? [...data.primera, ...data.segunda]
        : selectedDivision === "primera"
            ? data.primera
            : data.segunda;

    const width = typeof window !== 'undefined' ? Math.min(window.innerWidth - 100, 1000) : 1000;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxJornada = Math.max(...displayData.map(d => d.jornada));
    const minJornada = Math.min(...displayData.map(d => d.jornada));
    const xScale = (jornada: number) =>
        ((jornada - minJornada) / (maxJornada - minJornada)) * chartWidth;

    const maxOccupancy = 100;
    const yScale = (occupancy: number) =>
        chartHeight - (occupancy / maxOccupancy) * chartHeight;

    const primeraData = displayData.filter(d => d.division === "Primera División").sort((a, b) => a.jornada - b.jornada);
    const segundaData = displayData.filter(d => d.division === "Segunda División").sort((a, b) => a.jornada - b.jornada);

    const createLinePath = (points: JornadaData[]) => {
        if (points.length === 0) return "";
        return points.map((p, i) => {
            const x = xScale(p.jornada);
            const y = yScale(p.occupancyPct!);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };

    return (
        <div className="w-full bg-transparent p-2">


            <div className="relative overflow-x-auto">
                <svg width={width} height={height} className="overflow-visible">
                    <g transform={`translate(${padding.left}, ${padding.top})`}>
                        {[0, 25, 50, 75, 100].map(value => (
                            <g key={value}>
                                <line
                                    x1={0}
                                    y1={yScale(value)}
                                    x2={chartWidth}
                                    y2={yScale(value)}
                                    stroke="rgba(255, 255, 255, 0.03)"
                                    strokeWidth={1}
                                />
                                <text
                                    x={-10}
                                    y={yScale(value)}
                                    textAnchor="end"
                                    dominantBaseline="middle"
                                    className="text-xs fill-white/20"
                                >
                                    {value}%
                                </text>
                            </g>
                        ))}

                        {displayData.filter((_, i) => i % 2 === 0).map(d => (
                            <text
                                key={`x-${d.jornada}-${d.division}`}
                                x={xScale(d.jornada)}
                                y={chartHeight + 20}
                                textAnchor="middle"
                                className="text-xs fill-white/20"
                            >
                                J{d.jornada}
                            </text>
                        ))}

                        {(selectedDivision === "all" || selectedDivision === "primera") && primeraData.length > 0 && (
                            <motion.path
                                d={createLinePath(primeraData)}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                        )}

                        {(selectedDivision === "all" || selectedDivision === "segunda") && segundaData.length > 0 && (
                            <motion.path
                                d={createLinePath(segundaData)}
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                            />
                        )}

                        {displayData.filter(p => p.occupancyPct !== null && !isNaN(p.occupancyPct)).map((point, i) => {
                            const yPos = yScale(point.occupancyPct!);
                            if (isNaN(yPos)) return null;

                            return (
                                <motion.circle
                                    key={`${point.jornada}-${point.division}`}
                                    cx={xScale(point.jornada)}
                                    cy={yPos}
                                    r={hoveredPoint === point ? 5 : 3}
                                    fill={point.division === "Primera División" ? "#ef4444" : "#06b6d4"}
                                    stroke="#ffffff"
                                    strokeWidth={hoveredPoint === point ? 2 : 1}
                                    className="cursor-pointer transition-all"
                                    style={{
                                        filter: hoveredPoint === point ? `drop-shadow(0 0 6px ${point.division === "Primera División" ? "rgba(239, 68, 68, 0.6)" : "rgba(6, 182, 212, 0.6)"})` : "none"
                                    }}
                                    onMouseEnter={() => setHoveredPoint(point)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3, delay: i * 0.02 }}
                                />
                            );
                        })}
                    </g>
                </svg>

                {hoveredPoint && typeof hoveredPoint.occupancyPct === 'number' && (
                    <div
                        className="absolute bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-2 pointer-events-none z-50 min-w-[140px] shadow-xl"
                        style={{
                            left: Math.min(padding.left + xScale(hoveredPoint.jornada) + 10, width - 160),
                            top: padding.top + yScale(hoveredPoint.occupancyPct) - 60,
                        }}
                    >
                        <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                                Jornada {hoveredPoint.jornada}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${hoveredPoint.division === "Primera División"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-cyan-500/10 text-cyan-400"
                                }`}>
                                {hoveredPoint.division === "Primera División" ? "1ª Div" : "2ª Div"}
                            </span>
                        </div>

                        <div className="space-y-0.5">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] text-white/50">Ocupación</span>
                                <span className="text-sm font-mono font-bold text-white">
                                    {hoveredPoint.occupancyPct.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] text-white/50">Asistencia</span>
                                <span className="text-xs font-mono text-white/80">
                                    {new Intl.NumberFormat("es-ES", { notation: "compact" }).format(hoveredPoint.totalAttendance)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
