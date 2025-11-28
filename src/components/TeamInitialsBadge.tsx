"use client";

import { TEAM_MAPPINGS } from "@/utils/teamMappings";

interface TeamInitialsBadgeProps {
    teamName: string;
    size?: number;
    className?: string;
}

export default function TeamInitialsBadge({
    teamName,
    size = 40,
    className = ""
}: TeamInitialsBadgeProps) {
    const mapping = TEAM_MAPPINGS[teamName];
    const initials = mapping?.initials || teamName.substring(0, 3).toUpperCase();
    const colors = mapping?.colors || ["#333333", "#ffffff"];

    const [bgColor, textColor] = colors;

    return (
        <div
            className={`flex items-center justify-center rounded-full font-bold shadow-lg ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: bgColor,
                color: textColor,
                fontSize: size * 0.4,
                border: `2px solid ${textColor}20`
            }}
        >
            {initials}
        </div>
    );
}
