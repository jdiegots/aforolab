"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TeamLogo from "./TeamLogo";

type Stadium = {
    stadium_name: string;
    team_primary?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches: number;
};

export function StadiumScatter({ data }: { data: Stadium[] }) {
    const [hovered, setHovered] = useState<Stadium | null>(null);

    // Scales
    const maxCapacity = Math.max(...data.map((d) => d.capacity), 50000);
    const maxAttendance = Math.max(...data.map((d) => d.att_avg), 50000);

    return (
        <div className="relative w-full max-w-5xl mx-auto aspect-[16/9] md:aspect-[2/1] select-none">
            {/* Background Grid */}
            <div className="absolute inset-0 border-b border-l border-white/10">
                {/* Axis Labels */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/30 uppercase tracking-widest">
                    Capacidad del Estadio
                </div>
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-white/30 uppercase tracking-widest">
                    Asistencia Real
                </div>
            </div>

            {/* Scatter Points */}
            <div className="relative w-full h-full">
                {data.map((s) => {
                    const x = (s.capacity / maxCapacity) * 100;
                    const y = (s.att_avg / maxAttendance) * 100;
                    const isHighOcc = s.occ_avg_pct > 85;

                    return (
                        <motion.div
                            key={s.stadium_name}
                            className="absolute group cursor-pointer"
                            style={{
                                left: `${x}%`,
                                bottom: `${y}%`,
                                transform: 'translate(-50%, 50%)'
                            }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
                            onMouseEnter={() => setHovered(s)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <div className={`rounded-full transition-all duration-300 ${isHighOcc ? 'shadow-[0_0_15px_rgba(34,211,238,0.8)]' : ''}`}>
                                <TeamLogo
                                    teamName={s.team_primary || "Unknown"}
                                    size={isHighOcc ? 28 : 24}
                                    className="rounded-full"
                                />
                            </div>

                            {/* Tooltip Area (invisible but increases hit area) */}
                            <div className="absolute -inset-2 bg-transparent" />
                        </motion.div>
                    );
                })}
            </div>

            {/* Hover Info */}
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-4 left-4 z-20 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl min-w-[200px]"
                    >
                        <div className="text-xs text-white/50 uppercase tracking-wider mb-1">{hovered.stadium_name}</div>
                        <div className="text-lg font-bold text-white mb-2">{hovered.team_primary}</div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/60">Asistencia</span>
                                <span className="text-white font-mono">{new Intl.NumberFormat('es-ES').format(hovered.att_avg)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Capacidad</span>
                                <span className="text-white font-mono">{new Intl.NumberFormat('es-ES').format(hovered.capacity)}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
                                <span className="text-white/60">Ocupación</span>
                                <span className={`font-bold ${hovered.occ_avg_pct > 80 ? 'text-cyan-400' : 'text-white'}`}>
                                    {hovered.occ_avg_pct.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Context Text */}
            <div className="absolute top-4 right-4 text-right pointer-events-none opacity-50 hidden md:block">
                <p className="text-xs text-white/40 uppercase tracking-widest">Análisis de Eficiencia</p>
                <p className="text-[10px] text-white/30 mt-1 max-w-[150px]">
                    Cuanto más arriba y a la derecha, mayor es el estadio y la asistencia.
                    <br />
                    Los puntos brillantes indican &gt;85% de ocupación.
                </p>
            </div>
        </div>
    );
}
