// scripts/build-home-metrics.js
// Genera public/data/home_metrics.json a partir de:
// - data/stadium.csv
// - data/mun_data.csv
// - data/prov_data.csv
// - data/ccaa_data.csv
// - data/stadium_overrides.csv (opcional)
// - TODOS los CSV de data/matches/*.csv

const { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } = require("fs");
const { join } = require("path");
const Papa = require("papaparse");

function csvRead(path) {
  const txt = readFileSync(path, "utf8");
  const out = Papa.parse(txt, { header: true, skipEmptyLines: true });
  return out.data;
}

function toInt(x) {
  if (x === null || x === undefined) return NaN;
  const s = String(x).replace(/[.\\s]/g, "").replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function key(s) {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parseDateToWeekday(dateDDMMYYYY) {
  const m = (dateDDMMYYYY || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return -1;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  return d.getDay();
}

function main() {
  const root = process.cwd();
  const dataDir = join(root, "data");
  const pubDir = join(root, "public", "data");
  mkdirSync(pubDir, { recursive: true });

  const stadiums = csvRead(join(dataDir, "stadium.csv"));
  const mun = csvRead(join(dataDir, "mun_data.csv"));
  const prov = csvRead(join(dataDir, "prov_data.csv"));
  const ccaa = csvRead(join(dataDir, "ccaa_data.csv"));

  let overrides = [];
  const overridesPath = join(dataDir, "stadium_overrides.csv");
  if (existsSync(overridesPath)) {
    overrides = csvRead(overridesPath);
  }

  const mapMun = new Map(mun.map((r) => [key(r.mun_name), toInt(r.pob)]));
  const mapProv = new Map(prov.map((r) => [key(r.prov_name), toInt(r.pob)]));
  const mapCCAA = new Map(ccaa.map((r) => [key(r.ccaa_name), toInt(r.pob)]));

  const matchesDir = join(pubDir, "matches");
  const files = readdirSync(matchesDir).filter((f) => f.toLowerCase().endsWith(".csv"));
  const allMatches = [];
  for (const f of files) {
    const rows = csvRead(join(matchesDir, f));
    allMatches.push(...rows);
  }

  const teamIndex = new Map();
  const stadiumByName = new Map();

  for (const s of stadiums) {
    if (s.stadium_name) {
      stadiumByName.set(key(s.stadium_name), s);
    }

    const tp = (s.team_primary || "").trim();
    const ts = (s.team_sec || "").trim();

    if (tp) {
      const k = key(tp);
      const arr = teamIndex.get(k) || [];
      arr.push(s);
      teamIndex.set(k, arr);
    }
    if (ts) {
      const k2 = key(ts);
      const arr2 = teamIndex.get(k2) || [];
      arr2.push(s);
      teamIndex.set(k2, arr2);
    }
  }

  const overridesMap = new Map();
  for (const o of overrides) {
    if (o.season && o.spieltag && o.home_team && o.stadium_name) {
      const k = `${o.season}_${o.spieltag}_${key(o.home_team)}`;
      overridesMap.set(k, o.stadium_name.trim());
    }
  }

  // Mapa de aliases de equipos para matchear nombres diferentes
  const teamAliases = new Map([
    ["real racing club", "r. racing club"],
    ["albacete balompie", "albacete bp"],
    ["athletic bilbao", "athletic club"],
  ]);

  function guessStadiumByHomeTeam(homeTeam) {
    const normalizedTeam = key(homeTeam);
    // Intentar primero con el nombre original
    let arr = teamIndex.get(normalizedTeam);

    // Si no encuentra, buscar en aliases
    if (!arr || arr.length === 0) {
      const alias = teamAliases.get(normalizedTeam);
      if (alias) {
        arr = teamIndex.get(key(alias));
      }
    }

    if (!arr || arr.length === 0) return null;
    return arr[0];
  }

  const agg = new Map();
  const weekdayBuckets = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const m of allMatches) {
    const home = (m.home_team || "").trim();
    const att = toInt(m.attendance);
    if (!home || !Number.isFinite(att)) continue;

    let stad = null;

    const overrideKey = `${m.season}_${m.spieltag}_${key(home)}`;
    const overrideName = overridesMap.get(overrideKey);

    if (overrideName) {
      const found = stadiumByName.get(key(overrideName));
      if (found) {
        stad = found;
      } else {
        const def = guessStadiumByHomeTeam(home);
        if (def) {
          stad = { ...def, stadium_name: overrideName, stadium_id: null };
        }
      }
    } else {
      stad = guessStadiumByHomeTeam(home);
    }

    if (!stad) continue;

    const cap = toInt(stad.capacity);

    // Si el estadio tiene team_sec, diferenciar por equipo
    const hasSecondaryTeam = stad.team_sec && stad.team_sec.trim() !== "";

    let id;
    if (hasSecondaryTeam) {
      id = `${stad.stadium_id || key(stad.stadium_name)}_${key(home)}`;
    } else {
      id = stad.stadium_id || key(stad.stadium_name);
    }

    let a = agg.get(id);
    if (!a) {
      const isPrimary = key(home) === key(stad.team_primary || "");
      const isSecondary = hasSecondaryTeam && key(home) === key(stad.team_sec || "");

      a = {
        stadium_id: stad.stadium_id,
        stadium_name: stad.stadium_name,
        team_primary: isPrimary ? stad.team_primary : (isSecondary ? stad.team_sec : home),
        team_sec: isSecondary ? stad.team_primary : stad.team_sec,
        capacity: cap,
        municipality_name: stad.municipality_name,
        province_name: stad.province_name,
        ccaa_name: stad.ccaa_name,
        matches: 0,
        att_total: 0,
        att_avg: 0,
        occ_avg_pct: 0,
        att_avg_per1k_muni: null,
        att_avg_per1k_prov: null,
        att_avg_per1k_ccaa: null,
      };
      agg.set(id, a);
    }

    a.matches += 1;
    a.att_total += att;

    const wd = parseDateToWeekday(m.date || "");
    if (wd >= 0) {
      weekdayBuckets[wd].push({
        stadium_name: stad.stadium_name,
        att,
      });
    }
  }

  const rows = [];
  for (const [, a] of agg) {
    a.att_avg = a.matches ? Math.round(a.att_total / a.matches) : 0;
    a.occ_avg_pct = a.capacity > 0 ? +((a.att_avg / a.capacity) * 100).toFixed(2) : 0;

    const munPop = mapMun.get(key(a.municipality_name));
    const provPop = mapProv.get(key(a.province_name));
    const ccaaPop = mapCCAA.get(key(a.ccaa_name));

    // Guardar población en el objeto
    a.pop_muni = munPop || 0;
    a.pop_prov = provPop || 0;
    a.pop_ccaa = ccaaPop || 0;

    a.att_avg_per1k_muni = Number.isFinite(munPop) && munPop > 0 ? +((a.att_avg / munPop) * 1000).toFixed(2) : null;
    a.att_avg_per1k_prov = Number.isFinite(provPop) && provPop > 0 ? +((a.att_avg / provPop) * 1000).toFixed(2) : null;
    a.att_avg_per1k_ccaa = Number.isFinite(ccaaPop) && ccaaPop > 0 ? +((a.att_avg / ccaaPop) * 1000).toFixed(2) : null;

    rows.push(a);
  }

  function topBy(arr, proj, limit) {
    return arr
      .map((x) => {
        const val = proj(x);
        return {
          ...x,
          metric: val == null || !Number.isFinite(val) ? -Infinity : Number(val),
        };
      })
      .filter((x) => Number.isFinite(x.metric))
      .sort((a, b) => b.metric - a.metric)
      .slice(0, limit)
      .map(({ stadium_name, team_primary, capacity, municipality_name, province_name, ccaa_name, matches, att_total, att_avg, occ_avg_pct, metric }) => ({
        stadium_name, team_primary, capacity, municipality_name, province_name, ccaa_name, matches, att_total, att_avg, occ_avg_pct, metric,
      }));
  }

  const top_total_attendance = topBy(rows, (r) => r.att_total, 10);
  const top_avg_attendance = topBy(rows, (r) => r.att_avg, 10);
  const top_occ_pct = topBy(rows, (r) => r.occ_avg_pct, 10);
  const top_per1k_muni = topBy(rows, (r) => (r.att_avg_per1k_muni != null ? r.att_avg_per1k_muni : null), 10);
  const top_per1k_prov = topBy(rows, (r) => (r.att_avg_per1k_prov != null ? r.att_avg_per1k_prov : null), 10);
  const top_per1k_ccaa = topBy(rows, (r) => (r.att_avg_per1k_ccaa != null ? r.att_avg_per1k_ccaa : null), 10);

  const top_by_weekday = {};
  for (let d = 0; d < 7; d++) {
    const bucket = weekdayBuckets[d] || [];
    const aggByStadium = new Map();
    for (const r of bucket) {
      const cur = aggByStadium.get(r.stadium_name) || { stadium_name: r.stadium_name, matches: 0, att_total: 0 };
      cur.matches += 1;
      cur.att_total += r.att;
      aggByStadium.set(r.stadium_name, cur);
    }
    const list = Array.from(aggByStadium.values())
      .map((x) => ({ stadium_name: x.stadium_name, matches: x.matches, att_avg: Math.round(x.att_total / Math.max(1, x.matches)) }))
      .sort((a, b) => b.att_avg - a.att_avg)
      .slice(0, 10);
    top_by_weekday[String(d)] = list;
  }

  const out = {
    generated_at: new Date().toISOString(),
    totals: {
      stadiums_count: stadiums.length,
      matches_count: allMatches.length,
    },
    all_stadiums: rows.map(r => ({
      stadium_name: r.stadium_name,
      team_primary: r.team_primary,
      capacity: r.capacity,
      att_avg: r.att_avg,
      occ_avg_pct: r.occ_avg_pct,
      matches: r.matches,
      municipality: r.municipality_name,
      province: r.province_name,
      ccaa: r.ccaa_name,
      pop_muni: r.pop_muni,
      pop_prov: r.pop_prov,
      pop_ccaa: r.pop_ccaa
    })).sort((a, b) => b.att_avg - a.att_avg),
    top_total_attendance,
    top_avg_attendance,
    top_occ_pct,
    top_per1k_muni,
    top_per1k_prov,
    top_per1k_ccaa,
    top_by_weekday,
  };

  writeFileSync(join(pubDir, "home_metrics.json"), JSON.stringify(out, null, 2), "utf8");
  console.log("✔ public/data/home_metrics.json generado");
}

main();
