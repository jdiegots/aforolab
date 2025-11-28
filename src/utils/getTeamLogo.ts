import { getTeamSlug } from './teamMappings';

/**
 * Obtiene la ruta del escudo de un equipo.
 * Los escudos deben estar en: /images/teams/{slug}.png
 * 
 * Ejemplo:
 * - FC Barcelona -> /images/teams/barcelona.png
 * - Real Madrid -> /images/teams/real-madrid.png
 * - Real Sociedad B -> /images/teams/real-sociedad-b.png
 */
export function getTeamLogo(teamName: string): string {
    const slug = getTeamSlug(teamName);
    return `/images/teams/${slug}.png`;
}

/**
 * Obtiene la ruta del escudo de una competición.
 * Los escudos deben estar en: /images/competitions/{division}.png
 * 
 * Opciones:
 * - laliga-primera.png
 * - laliga-segunda.png
 * - laliga-both.png (para "Ambas")
 */
export function getCompetitionLogo(division: 'primera' | 'segunda' | 'both'): string {
    const logoMap = {
        'primera': '/images/competitions/laliga-primera.png',
        'segunda': '/images/competitions/laliga-segunda.png',
        'both': '/images/competitions/laliga-both.png'
    };

    return logoMap[division];
}
