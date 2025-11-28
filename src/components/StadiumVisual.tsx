"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function StadiumVisual() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Grid configuration
    const rows = 12;
    const cols = 24;
    const totalDots = rows * cols;

    return (
        <div className="relative flex items-center justify-center">
            <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1.5 md:gap-2">
                {Array.from({ length: totalDots }).map((_, i) => {
                    // Calculate position
                    const row = Math.floor(i / cols);
                    const col = i % cols;

                    // Create a "stadium" shape mask
                    // Center is (rows/2, cols/2)
                    const centerRow = rows / 2;
                    const centerCol = cols / 2;
                    const distRow = (row - centerRow) / (rows / 2);
                    const distCol = (col - centerCol) / (cols / 2);
                    const dist = Math.sqrt(distRow * distRow + distCol * distCol);

                    // Only render dots within a certain radius to make an oval/stadium shape
                    if (dist > 1) return <div key={i} className="h-1.5 w-1.5 md:h-2 md:w-2" />;

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: [0.2, 0.5, 0.2],
                                scale: [0.8, 1, 0.8]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                                ease: "easeInOut",
                            }}
                            className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700 md:h-2 md:w-2"
                        />
                    );
                })}
            </div>

            {/* Overlay gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-50 via-transparent to-neutral-50 dark:from-neutral-950 dark:to-neutral-950" />
        </div>
    );
}
