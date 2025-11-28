"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Stadium = {
    stadium_name: string;
    team_primary?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches: number;
};

export function StadiumBars({ data }: { data: Stadium[] }) {
    const [hovered, setHovered] = useState<Stadium | null>(null);

    // Sort by occupancy and take top 20
    const topStadiums = [...data]
        .sort((a, b) => b.occ_avg_pct - a.occ_avg_pct)
        .slice(0, 20);

    const maxOccupancy = Math.max(...topStadiums.map((s) => s.occ_avg_pct));

    return (
        <div className="relative w-full max-w-6xl mx-auto px-4 md:px-8">
            {/* Grid of horizontal bars */}
            <div className="space-y-2 md:space-y-3">
                {topStadiums.map((stadium, index) => {
                    const widthPercent = (stadium.occ_avg_pct / maxOccupancy) * 100;
                    const isHot = stadium.occ_avg_pct > 85;

                    return (
                        <motion.div
                            key={stadium.stadium_name}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.03 }}
                            onMouseEnter={() => setHovered(stadium)}
                            onMouseLeave={() => setHovered(null)}
                            className="group relative"
                        >
                            {/* Bar background */}
                            <div className="relative h-8 md:h-10 rounded-full overflow-hidden bg-white/5 backdrop-blur-sm">
                                {/* Filled portion */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${widthPercent}%` }}
                                    transition={{ duration: 1, delay: index * 0.03, ease: "easeOut" }}
                                    className={`h-full rounded-full transition-all duration-300 ${isHot
                                            ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                                            : "bg-gradient-to-r from-white/20 to-white/10"
                                        }`}
                                />

                                {/* Team name overlay */}
                                <div className="absolute inset-0 flex items-center justify-between px-3 md:px-4">
                                    <span className="text-xs md:text-sm font-medium text-white truncate max-w-[60%]">
                                        {stadium.team_primary}
                                    </span>
                                    <span className={`text-xs md:text-sm font-bold ${isHot ? "text-cyan-300" : "text-white/60"}`}>
                                        {stadium.occ_avg_pct.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* Hover tooltip */}
                            {hovered?.stadium_name === stadium.stadium_name && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute left-0 -top-20 z-50 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[250px] shadow-2xl"
                                >
                                    <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                                        {stadium.stadium_name}
                                    </div>
                                    <div className="text-lg font-bold text-white mb-2">
                                        {stadium.team_primary}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <div className="text-white/50 text-xs">Asistencia</div>
                                            <div className="text-white font-mono">
                                                {new Intl.NumberFormat("es-ES").format(stadium.att_avg)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-white/50 text-xs">Capacidad</div>
                                            <div className="text-white font-mono">
                                                {new Intl.NumberFormat("es-ES").format(stadium.capacity)}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/40">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" />
                    <span>+85% ocupación</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white/20" />
                    <span>Resto</span>
                </div>
            </div>
        </div>
    );
}
