"use client";

import React from "react";
import { motion } from "framer-motion";

interface StatsCounterProps {
    totalSpectators: number;
    avgOccupancy: number;
}

export const StatsCounter: React.FC<StatsCounterProps> = ({
    totalSpectators,
    avgOccupancy,
}) => {
    return (
        <div className="flex flex-col gap-8 w-full h-full justify-center">
            {/* Stats Vertical Stack - Centered Text, No Background */}
            <div className="flex flex-col gap-8 p-6">
                <div className="flex flex-col gap-2 items-center text-center">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Espectadores Totales</span>
                    <motion.span
                        key={totalSpectators}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl lg:text-4xl font-bold text-white font-mono"
                    >
                        {new Intl.NumberFormat("es-ES").format(totalSpectators)}
                    </motion.span>
                </div>

                <div className="w-full h-px bg-white/5" />

                <div className="flex flex-col gap-2 items-center text-center">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Ocupación Media</span>
                    <motion.span
                        key={avgOccupancy}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl lg:text-4xl font-bold text-cyan-400 font-mono"
                    >
                        {avgOccupancy.toFixed(1)}%
                    </motion.span>
                </div>
            </div>
        </div>
    );
};
