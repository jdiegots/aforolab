// Mapeo de nombres de equipos a sus versiones normalizadas y slugs
export const TEAM_MAPPINGS: Record<string, { displayName: string; slug: string; initials?: string; colors?: [string, string] }> = {
    // Primera División
    "Athletic Bilbao": { displayName: "Athletic Club", slug: "athletic-club", initials: "ATH", colors: ["#e30613", "#ffffff"] },
    "Athletic Club": { displayName: "Athletic Club", slug: "athletic-club", initials: "ATH", colors: ["#e30613", "#ffffff"] },
    "Atlético de Madrid": { displayName: "Atlético de Madrid", slug: "atletico-madrid", initials: "ATM", colors: ["#cb3524", "#171f55"] },
    "CA Osasuna": { displayName: "CA Osasuna", slug: "osasuna", initials: "OSA", colors: ["#d91e18", "#0a1d3e"] },
    "RC Celta": { displayName: "RC Celta", slug: "celta", initials: "CEL", colors: ["#8ac3ee", "#ffffff"] },
    "Deportivo Alavés": { displayName: "Deportivo Alavés", slug: "alaves", initials: "ALA", colors: ["#005eb8", "#ffffff"] },
    "Elche CF": { displayName: "Elche CF", slug: "elche", initials: "ELC", colors: ["#00a651", "#ffffff"] },
    "FC Barcelona": { displayName: "FC Barcelona", slug: "barcelona", initials: "FCB", colors: ["#004d98", "#a50044"] },
    "Getafe CF": { displayName: "Getafe CF", slug: "getafe", initials: "GET", colors: ["#005999", "#ffffff"] },
    "Girona FC": { displayName: "Girona FC", slug: "girona", initials: "GIR", colors: ["#ce1126", "#ffffff"] },
    "Levante UD": { displayName: "Levante UD", slug: "levante", initials: "LEV", colors: ["#004d98", "#a50044"] },
    "Rayo Vallecano": { displayName: "Rayo Vallecano", slug: "rayo-vallecano", initials: "RVM", colors: ["#ffffff", "#ce1126"] },
    "RCD Espanyol": { displayName: "RCD Espanyol", slug: "espanyol", initials: "ESP", colors: ["#007fc8", "#ffffff"] },
    "RCD Mallorca": { displayName: "RCD Mallorca", slug: "mallorca", initials: "MLL", colors: ["#e20613", "#000000"] },
    "Real Betis": { displayName: "Real Betis", slug: "betis", initials: "BET", colors: ["#0bb363", "#ffffff"] },
    "Real Madrid": { displayName: "Real Madrid", slug: "real-madrid", initials: "RMA", colors: ["#ffffff", "#000000"] },
    "Real Oviedo": { displayName: "Real Oviedo", slug: "oviedo", initials: "OVI", colors: ["#003175", "#ffffff"] },
    "Real Sociedad": { displayName: "Real Sociedad", slug: "real-sociedad", initials: "RSO", colors: ["#0067b1", "#ffffff"] },
    "Sevilla FC": { displayName: "Sevilla FC", slug: "sevilla", initials: "SEV", colors: ["#ffffff", "#d71920"] },
    "Valencia CF": { displayName: "Valencia CF", slug: "valencia", initials: "VAL", colors: ["#ffffff", "#000000"] },
    "Villarreal CF": { displayName: "Villarreal CF", slug: "villarreal", initials: "VIL", colors: ["#fbe10f", "#00529f"] },

    // Segunda División
    "AD Ceuta FC": { displayName: "AD Ceuta FC", slug: "ceuta", initials: "CEU", colors: ["#ffffff", "#000000"] },
    "Albacete Balompié": { displayName: "Albacete Balompié", slug: "albacete", initials: "ALB", colors: ["#ffffff", "#000000"] },
    "Albacete BP": { displayName: "Albacete Balompié", slug: "albacete", initials: "ALB", colors: ["#ffffff", "#000000"] },
    "Albacete": { displayName: "Albacete Balompié", slug: "albacete", initials: "ALB", colors: ["#ffffff", "#000000"] },
    "Burgos CF": { displayName: "Burgos CF", slug: "burgos", initials: "BUR", colors: ["#ffffff", "#000000"] },
    "Cádiz CF": { displayName: "Cádiz CF", slug: "cadiz", initials: "CAD", colors: ["#fded00", "#003472"] },
    "CD Castellón": { displayName: "CD Castellón", slug: "castellon", initials: "CAS", colors: ["#000000", "#ffffff"] },
    "CD Leganés": { displayName: "CD Leganés", slug: "leganes", initials: "LEG", colors: ["#005eb8", "#ffffff"] },
    "CD Mirandés": { displayName: "CD Mirandés", slug: "mirandes", initials: "MIR", colors: ["#d91e18", "#000000"] },
    "Córdoba CF": { displayName: "Córdoba CF", slug: "cordoba", initials: "COR", colors: ["#007a33", "#ffffff"] },
    "Cultural Leonesa": { displayName: "Cultural Leonesa", slug: "cultural-leonesa", initials: "CUL", colors: ["#ffffff", "#d91e18"] },
    "FC Andorra": { displayName: "FC Andorra", slug: "andorra", initials: "AND", colors: ["#3757B8", "#FFCC00"] },
    "Granada CF": { displayName: "Granada CF", slug: "granada", initials: "GRA", colors: ["#a61a1a", "#ffffff"] },
    "Málaga CF": { displayName: "Málaga CF", slug: "malaga", initials: "MAL", colors: ["#0077c8", "#ffffff"] },
    "Real Racing Club": { displayName: "Real Racing Club", slug: "racing-santander", initials: "RAC", colors: ["#007a33", "#ffffff"] },
    "R. Racing Club": { displayName: "Real Racing Club", slug: "racing-santander", initials: "RAC", colors: ["#007a33", "#ffffff"] },
    "Racing": { displayName: "Real Racing Club", slug: "racing-santander", initials: "RAC", colors: ["#007a33", "#ffffff"] },
    "RC Deportivo": { displayName: "RC Deportivo", slug: "deportivo", initials: "DEP", colors: ["#005eb8", "#ffffff"] },
    "Real Sporting": { displayName: "Real Sporting", slug: "sporting", initials: "SPO", colors: ["#d91e18", "#ffffff"] },
    "Real Valladolid CF": { displayName: "Real Valladolid CF", slug: "valladolid", initials: "VLL", colors: ["#5e2a84", "#ffffff"] },
    "Real Zaragoza": { displayName: "Real Zaragoza", slug: "zaragoza", initials: "ZAR", colors: ["#ffffff", "#005eb8"] },
    "SD Eibar": { displayName: "SD Eibar", slug: "eibar", initials: "EIB", colors: ["#005eb8", "#a50044"] },
    "SD Huesca": { displayName: "SD Huesca", slug: "huesca", initials: "HUE", colors: ["#0a1d3e", "#a50044"] },
    "UD Almería": { displayName: "UD Almería", slug: "almeria", initials: "ALM", colors: ["#d91e18", "#ffffff"] },
    "UD Las Palmas": { displayName: "UD Las Palmas", slug: "las-palmas", initials: "LPA", colors: ["#ffc400", "#005eb8"] },
    "Real Sociedad B": { displayName: "Real Sociedad B", slug: "real-sociedad-b", initials: "RSB", colors: ["#0067b1", "#ffffff"] },
};

// Función para obtener el nombre normalizado de un equipo
export function getTeamDisplayName(teamName: string): string {
    return TEAM_MAPPINGS[teamName]?.displayName || teamName;
}

// Función para obtener el slug de un equipo
export function getTeamSlug(teamName: string): string {
    return TEAM_MAPPINGS[teamName]?.slug || teamName.toLowerCase().replace(/\s+/g, '-');
}

// Función para obtener el nombre original desde un slug
export function getTeamNameFromSlug(slug: string): string | null {
    const entry = Object.entries(TEAM_MAPPINGS).find(([_, data]) => data.slug === slug);
    return entry ? entry[1].displayName : null;
}

// Función para normalizar todos los nombres en un array de datos
export function normalizeTeamNames<T extends { home_team?: string; away_team?: string; team_primary?: string }>(
    data: T[]
): T[] {
    return data.map(item => ({
        ...item,
        home_team: item.home_team ? getTeamDisplayName(item.home_team) : item.home_team,
        away_team: item.away_team ? getTeamDisplayName(item.away_team) : item.away_team,
        team_primary: item.team_primary ? getTeamDisplayName(item.team_primary) : item.team_primary,
    }));
}
