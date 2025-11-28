import type { MatchData } from '@/utils/processMatchData';
import { getTeamDisplayName } from '@/utils/teamMappings';

// Detect if a home match is played in the Canary Islands.
export function isCanaryHomeMatch(m: MatchData, stadiums: any[] = [], fullStadiumData: any[] = []) {
    if (!m || !m.home_team) return false;
    const ht = m.home_team.toString().toLowerCase();
    if (ht.includes('las palmas')) return true;

    const lookup = (arr: any[] = []) => arr.find((s: any) => {
        if (!s) return false;
        const t1 = (s.team_primary || '').toString().toLowerCase();
        const t2 = (s.team_sec || '').toString().toLowerCase();
        if (t1 && t1.includes(ht)) return true;
        if (t2 && t2.includes(ht)) return true;
        try {
            if (s.team_primary && getTeamDisplayName(s.team_primary).toLowerCase() === ht) return true;
        } catch (_) {}
        return false;
    });

    const found = lookup(fullStadiumData) || lookup(stadiums);
    if (!found) return false;

    const ccaa = (found.ccaa || '').toString().toLowerCase();
    const muni = (found.municipality || found.municipality_name || '').toString().toLowerCase();
    if (ccaa.includes('canarias') || muni.includes('las palmas') || muni.includes('palmas')) return true;
    return false;
}

// Build a Date object for a match using date + time, applying a -1h offset for Canary home matches
export function buildMatchDateTime(dateStr: string, timeStr: string, m?: MatchData, stadiums: any[] = [], fullStadiumData: any[] = []) {
    try {
        const parts = dateStr?.includes('/') ? dateStr.split('/') : dateStr?.split('.');
        const [day, month, year] = parts.map(Number);
        let hour = 0, minute = 0;
        if (timeStr) {
            const tp = timeStr.split(':').map(Number);
            hour = tp[0] || 0;
            minute = tp[1] || 0;
        }

        const dt = new Date(year, month - 1, day, hour, minute);
        if (m && isCanaryHomeMatch(m, stadiums, fullStadiumData)) {
            dt.setHours(dt.getHours() - 1);
        }
        return dt;
    } catch (_) {
        return new Date();
    }
}

export function formatAdjustedTime(m: MatchData, stadiums: any[] = [], fullStadiumData: any[] = []) {
    if (!m?.time) return '';
    try {
        const dt = buildMatchDateTime(m.date, m.time, m, stadiums, fullStadiumData);
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    } catch (_) {
        return m.time.substring(0,5);
    }
}

export function formatAdjustedDate(m: MatchData, stadiums: any[] = [], fullStadiumData: any[] = []) {
    if (!m?.date) return '';
    try {
        const dt = buildMatchDateTime(m.date, m.time, m, stadiums, fullStadiumData);
        return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(dt);
    } catch (_) {
        return m.date;
    }
}
