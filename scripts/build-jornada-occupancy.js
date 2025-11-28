const fs = require('fs');
const path = require('path');

// Leer archivos CSV
function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].trim() : null;
        });
        return obj;
    });
}

// Leer datos de estadios
function readStadiumCSV() {
    const content = fs.readFileSync('data/stadium.csv', 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = lines[0].split(';').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(';');
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].trim() : null;
        });
        return obj;
    });
}

// Cargar datos
const laligaMatches = readCSV('data/matches/laliga_2025_j1-13.csv');
const segundaMatches = readCSV('data/matches/segunda_2025_j1-15.csv');
const stadiums = readStadiumCSV();

// Crear mapa de capacidades por equipo (array de capacidades)
const capacityMap = {};
stadiums.forEach(s => {
    const addCap = (team, cap) => {
        if (!team) return;
        if (!capacityMap[team]) capacityMap[team] = [];
        capacityMap[team].push(parseInt(cap));
    };
    addCap(s.team_primary, s.capacity);
    addCap(s.team_sec, s.capacity);
});

// Ordenar capacidades
Object.keys(capacityMap).forEach(k => {
    capacityMap[k].sort((a, b) => a - b);
});

// Procesar partidos por jornada
function processMatchesByJornada(matches, division) {
    const jornadaData = {};

    matches.forEach(match => {
        const jornada = parseInt(match.spieltag);
        const attendance = parseInt(match.attendance);
        const homeTeam = match.home_team;

        let capacity = 0;
        const caps = capacityMap[homeTeam] || [];
        if (caps.length > 0) {
            if (attendance > 0) {
                const fitting = caps.find(c => c >= attendance);
                capacity = fitting || caps[caps.length - 1];
            } else {
                capacity = caps[caps.length - 1];
            }
        }

        if (!jornadaData[jornada]) {
            jornadaData[jornada] = {
                jornada,
                division,
                totalAttendance: 0,
                totalCapacity: 0,
                matches: 0
            };
        }

        // Solo sumar si hay capacidad y asistencia válida
        if (capacity > 0 && !isNaN(attendance)) {
            jornadaData[jornada].totalAttendance += attendance;
            jornadaData[jornada].totalCapacity += capacity;
            jornadaData[jornada].matches += 1;
        }
    });

    return Object.values(jornadaData).map(j => ({
        ...j,
        occupancyPct: j.totalCapacity > 0 ? (j.totalAttendance / j.totalCapacity) * 100 : 0
    }));
}

const laligaByJornada = processMatchesByJornada(laligaMatches, 'Primera División');
const segundaByJornada = processMatchesByJornada(segundaMatches, 'Segunda División');

// Combinar y ordenar
const allJornadas = [...laligaByJornada, ...segundaByJornada].sort((a, b) => {
    if (a.division === b.division) {
        return a.jornada - b.jornada;
    }
    return a.division === 'Primera División' ? -1 : 1;
});

const output = {
    generated_at: new Date().toISOString(),
    primera: laligaByJornada.sort((a, b) => a.jornada - b.jornada),
    segunda: segundaByJornada.sort((a, b) => a.jornada - b.jornada),
    combined: allJornadas
};

fs.writeFileSync('public/data/jornada_occupancy.json', JSON.stringify(output, null, 2));

console.log(`Procesados ${laligaByJornada.length} jornadas de Primera División`);
console.log(`Procesados ${segundaByJornada.length} jornadas de Segunda División`);
console.log('Archivo generado: public/data/jornada_occupancy.json');
