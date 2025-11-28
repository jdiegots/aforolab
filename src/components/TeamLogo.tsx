"use client";

import Image from 'next/image';
import { useState } from 'react';
import { getTeamLogo } from '@/utils/getTeamLogo';

interface TeamLogoProps {
    teamName: string;
    size?: number;
    className?: string;
    fallback?: '⚽' | '🏆';
}

/**
 * Componente para mostrar el escudo de un equipo.
 * Si el PNG no existe, muestra un fallback (por defecto ⚽).
 * 
 * Uso:
 * <TeamLogo teamName="FC Barcelona" size={40} />
 */
export default function TeamLogo({
    teamName,
    size = 40,
    className = "",
    fallback = '⚽'
}: TeamLogoProps) {
    const [imageError, setImageError] = useState(false);
    const logoPath = getTeamLogo(teamName);

    if (imageError) {
        // Fallback: mostrar emoji si no existe el PNG
        return (
            <div
                className={`flex items-center justify-center ${className}`}
                style={{ width: size, height: size }}
            >
                <span style={{ fontSize: size * 0.6 }}>{fallback}</span>
            </div>
        );
    }

    return (
        <Image
            src={logoPath}
            alt={`Escudo de ${teamName}`}
            width={size}
            height={size}
            className={className}
            onError={() => setImageError(true)}
        />
    );
}
