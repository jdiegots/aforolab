const fs = require('fs');
const path = require('path');

function normalize(s) {
  if (!s && s !== 0) return '';
  return s
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

function parseCsv(content) {
  // Heurística robusta: algunos CSV (p.ej. stadium.csv) contienen saltos de línea
  // dentro de campos. Intentamos detectar un encabezado y luego reensamblar
  // registros que comienzan con un id numérico seguido de `;`.
  const rawLines = content.split(/\r?\n/);
  if (rawLines.length === 0) return [];

  // Obtener encabezado (primera línea que contiene al menos un separador)
  let headerLineIndex = rawLines.findIndex(l => l && (l.includes(';') || l.includes(',')));
  if (headerLineIndex === -1) return [];
  const header = rawLines[headerLineIndex].split(/;|,/).map(h => h.trim());

  const rest = rawLines.slice(headerLineIndex + 1);

  // Si los registros empiezan con un id numérico por línea (p.ej. stadium.csv),
  // usar la heurística de agrupado; en caso contrario usar el split por línea.
  const joined = rest.join('\n');
  const hasNumericStarts = /(^|\n)\d+;/.test(joined);

  let recordParts = [];
  if (hasNumericStarts) {
    recordParts = joined.split(/(?=^\d+;)/m).map(r => r.trim()).filter(Boolean);
  } else {
    recordParts = rest.map(r => r.trim()).filter(Boolean);
  }

  const rows = recordParts.map(part => {
    const cols = part.split(/;|,/).map(c => c.trim());
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = cols[i] !== undefined ? cols[i] : '';
    });
    return obj;
  });

  return rows;
}

(async function main() {
  const root = path.resolve(__dirname, '..');
  const dataDir = path.join(root, 'data');
  const publicDataDir = path.join(root, 'public', 'data');

  const stadiumCsvPath = path.join(dataDir, 'stadium.csv');
  const munCsvPath = path.join(dataDir, 'mun_data.csv');
  const provCsvPath = path.join(dataDir, 'prov_data.csv');
  const ccaaCsvPath = path.join(dataDir, 'ccaa_data.csv');

  if (!fs.existsSync(stadiumCsvPath)) {
    console.error('No existe', stadiumCsvPath);
    process.exit(1);
  }

  const stadiumCsv = fs.readFileSync(stadiumCsvPath, 'utf8');
  const munCsv = fs.existsSync(munCsvPath) ? fs.readFileSync(munCsvPath, 'utf8') : '';
  const provCsv = fs.existsSync(provCsvPath) ? fs.readFileSync(provCsvPath, 'utf8') : '';
  const ccaaCsv = fs.existsSync(ccaaCsvPath) ? fs.readFileSync(ccaaCsvPath, 'utf8') : '';

  const stadiumRows = parseCsv(stadiumCsv);
  const munRows = munCsv ? parseCsv(munCsv) : [];
  const provRows = provCsv ? parseCsv(provCsv) : [];
  const ccaaRows = ccaaCsv ? parseCsv(ccaaCsv) : [];

  const munMap = new Map();
  munRows.forEach(r => {
    const key = normalize(r['mun_name'] || r['municipality'] || r['municipality_name']);
    const val = Number((r['pob'] || r['poblacion'] || r['pob_muni']) || 0) || null;
    if (key) munMap.set(key, val);
  });

  const provMap = new Map();
  provRows.forEach(r => {
    const key = normalize(r['prov_name'] || r['province'] || r['province_name']);
    const val = Number((r['pob'] || r['poblacion'] || r['pob_prov']) || 0) || null;
    if (key) provMap.set(key, val);
  });

  const ccaaMap = new Map();
  ccaaRows.forEach(r => {
    const key = normalize(r['ccaa_name'] || r['ccaa'] || r['ccaa_name']);
    const val = Number((r['pob'] || r['poblacion'] || r['pob_ccaa']) || 0) || null;
    if (key) ccaaMap.set(key, val);
  });

  function findBest(map, target) {
    if (!target) return null;
    const key = normalize(target);
    if (map.has(key)) return map.get(key);
    // fallback heuristics: startsWith / includes
    for (const [k, v] of map.entries()) {
      if (k === key) return v;
      if (k.includes(key) || key.includes(k)) return v;
    }
    return null;
  }

  const output = {};
  const missing = [];

  stadiumRows.forEach(row => {
    const stadiumName = row['stadium_name'] || row['stadium'] || '';
    const muni = row['municipality_name'] || row['mun_name'] || row['municipality'] || '';
    const prov = row['province_name'] || row['prov_name'] || row['province'] || '';
    const ccaa = row['ccaa_name'] || row['ccaa'] || '';

    const pop_muni = findBest(munMap, muni);
    const pop_prov = findBest(provMap, prov);
    const pop_ccaa = findBest(ccaaMap, ccaa);

    if (pop_muni === null && pop_prov === null && pop_ccaa === null) {
      missing.push(stadiumName);
    }

    output[stadiumName] = {
      municipality: muni || null,
      province: prov || null,
      ccaa: ccaa || null,
      pop_muni: pop_muni,
      pop_prov: pop_prov,
      pop_ccaa: pop_ccaa
    };
  });

  if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });
  const outPath = path.join(publicDataDir, 'stadium_populations.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log('Wrote', outPath);
  console.log('Total stadiums processed:', stadiumRows.length);
  console.log('Missing population info for', missing.length, 'stadiums');
  if (missing.length) console.log(missing.join('\n'));
})();
