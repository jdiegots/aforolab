"use client";

import Image from 'next/image';
import { useState } from 'react';
import { getCompetitionLogo } from '@/utils/getTeamLogo';

interface CompetitionLogoProps {
    division: 'primera' | 'segunda' | 'both';
    size?: number;
    className?: string;
}

/**
 * Componente para mostrar el escudo de una competición.
 * Si el PNG no existe, muestra un fallback con emoji.
 */
export default function CompetitionLogo({
    division,
    size = 40,
    className = ""
}: CompetitionLogoProps) {
    const [imageError, setImageError] = useState(false);
    const logoPath = getCompetitionLogo(division);

    const fallbackEmoji = division === 'both' ? '⚽' : division === 'primera' ? '1ª' : '2ª';
    const fallbackColor = division === 'both'
        ? 'bg-gradient-to-br from-red-500 to-cyan-500'
        : division === 'primera'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-cyan-500/20 text-cyan-400';

    if (imageError) {
        return (
            <div
                className={`flex items-center justify-center rounded-full font-bold shadow-lg ${fallbackColor} ${className}`}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {fallbackEmoji}
            </div>
        );
    }

    return (
        <Image
            src={logoPath}
            alt={`Escudo ${division}`}
            width={size}
            height={size}
            className={className}
            onError={() => setImageError(true)}
        />
    );
}
