import Link from "next/link";
import { getTeamSlug } from "@/utils/teamMappings";
import { MapPin, ArrowRight } from "lucide-react";

// Reuse the same Stadium type definition from page.tsx for consistency
export type Stadium = {
    stadium_name: string;
    team_primary?: string;
    capacity: number;
    att_avg: number;
    occ_avg_pct: number;
    matches: number;
};

interface TeamCardProps {
    team: string;
    stadiums: Stadium[];
}

/**
 * A compact, visually appealing card representing a team and its stadiums.
 * Designed to be smaller than the previous inline markup and include subtle hover effects.
 */
export default function TeamCard({ team, stadiums }: TeamCardProps) {
    const slug = getTeamSlug(team);
    return (
        <Link
            href={`/equipo/${encodeURIComponent(slug)}`}
            className="block rounded-md bg-black/30 hover:bg-white/5 transition-colors p-2 mb-1"
        >
            <div className="flex items-center justify-between">
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-medium text-white truncate">{team}</span>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        {stadiums.map((stadium, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-1 text-xs text-neutral-400"
                            >
                                <MapPin className="h-3 w-3" />
                                <span className="truncate" title={stadium.stadium_name}>
                                    {stadium.stadium_name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-500 ml-2 flex-shrink-0" />
            </div>
        </Link>
    );
}
