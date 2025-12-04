import { getTeamDisplayName } from './teamMappings';
import { buildMatchDateTime } from '@/utils/timeHelpers';

export interface JornadaData {
    jornada: number;
    division: string;
    totalAttendance: number;
    totalCapacity: number;
    matches: number;
    occupancyPct: number | null;
}

export interface MatchData {
    season: number;
    spieltag: number;
    date: string;
    time: string;
    home_team: string;
    away_team: string;
    home_goals: number;
    away_goals: number;
    attendance: number | null;
    division: string;
    occupancyPct?: number;
    stadium_name?: string; // Added stadium name
    // computed local fields (may differ for stadiums in different timezones, e.g. Canary Islands)
    localDateTime?: string; // ISO string
    localTime?: string; // HH:MM
    localDate?: string; // human formatted date (es-ES short)
    localDay?: number; // 0..6 day of week for local datetime
    localHour?: number; // hour (0..23) for local datetime
}

export const processMatchData = async (stadiumData: any[]) => {
    try {
        if (!Array.isArray(stadiumData) || stadiumData.length === 0) {
            return { primera: [], segunda: [], allMatches: [] };
        }

        // Crear mapa de estadios por equipo
        const stadiumMap: Record<string, { capacity: number; name: string }[]> = {};
        stadiumData.forEach(s => {
            if (s.team_primary) {
                const normalizedName = getTeamDisplayName(s.team_primary);
                if (!stadiumMap[normalizedName]) {
                    stadiumMap[normalizedName] = [];
                }
                stadiumMap[normalizedName].push({ capacity: s.capacity, name: s.stadium_name });
            }
        });

        // Ordenar estadios de menor a mayor capacidad para la heurística
        Object.keys(stadiumMap).forEach(team => {
            stadiumMap[team].sort((a, b) => a.capacity - b.capacity);
        });

        // Cargar y procesar archivos CSV
        // Usamos Promise.allSettled para que si falla overrides no rompa todo
        const [laligaRes, segundaRes, overridesRes] = await Promise.all([
            fetch('/data/matches/laliga_2025_j1-13.csv'),
            fetch('/data/matches/segunda_2025_j1-15.csv'),
            fetch('/data/stadium_overrides.csv').catch(e => null) // Catch error specifically for overrides
        ]);

        const laligaText = await laligaRes.text();
        const segundaText = await segundaRes.text();
        const overridesText = overridesRes && overridesRes.ok ? await overridesRes.text() : "";

        // Parse overrides
        const overridesMap = new Map<string, string>();
        if (overridesText) {
            overridesText.split('\n').slice(1).forEach(line => {
                if (!line.trim()) return;
                const [season, spieltag, home_team, stadium_name] = line.split(';');
                if (season && spieltag && home_team && stadium_name) {
                    const key = `${season}-${spieltag}-${getTeamDisplayName(home_team)}`;
                    overridesMap.set(key, stadium_name.trim());
                }
            });
        }

        const processCSV = (text: string, division: string) => {
            const lines = text.split('\n').filter(l => l.trim());

            // Parsear matches con nombres normalizados
            const matches: MatchData[] = lines.slice(1).map(line => {
                const values = line.split(',');
                const season = parseInt(values[0]);
                const spieltag = parseInt(values[1]);
                const homeTeam = getTeamDisplayName(values[4]);
                const awayTeam = getTeamDisplayName(values[5]);
                const attendance = parseInt(values[8]);

                let capacity = 0;
                let stadiumName: string | undefined = undefined;

                // 1. Check overrides
                const overrideKey = `${season}-${spieltag}-${homeTeam}`;
                if (overridesMap.has(overrideKey)) {
                    stadiumName = overridesMap.get(overrideKey);
                    // Find capacity for this stadium
                    const stadiumData = stadiumMap[homeTeam]?.find(s => s.name === stadiumName);
                    if (stadiumData) {
                        capacity = stadiumData.capacity;
                    } else {
                        // Fallback if stadium name from override doesn't match known stadiums for team
                        // Try to find it in global stadium data? Or just use max capacity?
                        // Let's try to find it in the team's stadiums by partial match
                        const partialMatch = stadiumMap[homeTeam]?.find(s => s.name.includes(stadiumName!) || stadiumName!.includes(s.name));
                        if (partialMatch) {
                            capacity = partialMatch.capacity;
                        }
                    }
                }
                // 2. Special case for FC Barcelona default
                else if (homeTeam === "FC Barcelona") {
                    stadiumName = "Spotify Camp Nou";
                    const stadiumData = stadiumMap[homeTeam]?.find(s => s.name === stadiumName);
                    capacity = stadiumData ? stadiumData.capacity : 99354; // Default capacity if not found
                }
                // 3. Heuristic for others
                else {
                    const teamStadiums = stadiumMap[homeTeam] || [];
                    if (teamStadiums.length > 0) {
                        if (attendance > 0) {
                            // Buscar el primer estadio donde quepa la gente
                            const fitting = teamStadiums.find(s => s.capacity >= attendance);
                            // Si cabe en alguno, usar ese. Si no (overbooking?), usar el más grande.
                            const selected = fitting || teamStadiums[teamStadiums.length - 1];
                            capacity = selected.capacity;
                            stadiumName = selected.name;
                        } else {
                            // Si no hay asistencia, usar el más grande por defecto
                            const selected = teamStadiums[teamStadiums.length - 1];
                            capacity = selected.capacity;
                            stadiumName = selected.name;
                        }
                    }
                }

                // compute local datetime using stadium data (for Canary islands adjustments)
                const matchSeed = {
                    season,
                    spieltag,
                    date: values[2],
                    time: values[3],
                    home_team: homeTeam,
                } as MatchData;
                const dt = buildMatchDateTime(values[2], values[3], matchSeed, stadiumData, stadiumData);
                const hh = String(dt.getHours()).padStart(2, '0');
                const mm = String(dt.getMinutes()).padStart(2, '0');
                const localTimeStr = `${hh}:${mm}`;
                const localDateStr = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(dt);

                return {
                    season,
                    spieltag,
                    date: values[2],
                    time: values[3],
                    home_team: homeTeam,
                    away_team: awayTeam,
                    home_goals: parseInt(values[6]),
                    away_goals: parseInt(values[7]),
                    attendance: isNaN(attendance) || attendance === 0 ? null : attendance,
                    division,
                    occupancyPct: (capacity > 0 && attendance > 0) ? (attendance / capacity) * 100 : undefined,
                    stadium_name: stadiumName,
                    // local-normalized fields
                    localDateTime: dt.toISOString(),
                    localTime: localTimeStr,
                    localDate: localDateStr,
                    localDay: dt.getDay(),
                    localHour: dt.getHours(),
                };
            });

            // Agrupar por jornada (solo partidos con asistencia válida)
            const byJornada: Record<number, JornadaData> = {};
            matches.filter(m => m.attendance !== null).forEach(match => {
                if (!byJornada[match.spieltag]) {
                    byJornada[match.spieltag] = {
                        jornada: match.spieltag,
                        division,
                        totalAttendance: 0,
                        totalCapacity: 0,
                        matches: 0,
                        occupancyPct: 0
                    };
                }

                // Recalcular capacidad para el agregado (usando la misma lógica)
                const teamStadiums = stadiumMap[match.home_team] || [];
                let capacity = 0;
                if (teamStadiums.length > 0 && match.attendance) {
                    const fitting = teamStadiums.find(s => s.capacity >= match.attendance!);
                    const selected = fitting || teamStadiums[teamStadiums.length - 1];
                    capacity = selected.capacity;
                }

                if (capacity > 0 && match.attendance) {
                    byJornada[match.spieltag].totalAttendance += match.attendance;
                    byJornada[match.spieltag].totalCapacity += capacity;
                    byJornada[match.spieltag].matches += 1;
                }
            });

            // Calcular porcentajes solo para jornadas con datos válidos
            const jornadaStats = Object.values(byJornada)
                .filter(j => j.matches > 0 && j.totalCapacity > 0)
                .map(j => ({
                    ...j,
                    occupancyPct: (j.totalAttendance / j.totalCapacity) * 100
                }))
                .sort((a, b) => a.jornada - b.jornada);

            return { jornadaStats, allMatches: matches };
        };

        const primera = processCSV(laligaText, 'Primera División');
        const segunda = processCSV(segundaText, 'Segunda División');

        return {
            primera: primera.jornadaStats,
            segunda: segunda.jornadaStats,
            allMatches: [...primera.allMatches, ...segunda.allMatches]
        };
    } catch (err) {
        console.error('Error loading match data:', err);
        return { primera: [], segunda: [], allMatches: [] };
    }
};
