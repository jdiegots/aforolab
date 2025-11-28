// scripts/scrape-transfermarkt.js
// Uso típico:
// node scripts/scrape-transfermarkt.js --season 2025 --maxES1 13 --maxES2 15 --outES1 laliga_2025_j1-13.csv --outES2 segunda_2025_j1-15.csv --timeoutMs 60000
//
// Dependencias: axios cheerio minimist
// npm i axios cheerio minimist

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const minimist = require("minimist");

const argv = minimist(process.argv.slice(2));
const SEASON = String(argv.season || 2025);
const MAX_ES1 = Number(argv.maxES1 || 13);
const MAX_ES2 = Number(argv.maxES2 || 0);
const OUT_ES1 = String(argv.outES1 || `transfermarkt_ES1_${SEASON}_j1-${MAX_ES1}.csv`);
const OUT_ES2 = String(argv.outES2 || (MAX_ES2 ? `transfermarkt_ES2_${SEASON}_j1-${MAX_ES2}.csv` : ""));
const TIMEOUT_MS = Number(argv.timeoutMs || 45000); // sube si hace falta (p.ej. 60000)

const BASE = "https://www.transfermarkt.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// === Normalización de nombres de equipo (según tus reglas) ===
const TEAM_MAP = new Map([
  ["Celta de Vigo", "RC Celta"],
  ["RCD Espanyol Barcelona", "RCD Espanyol"],
  ["Real Betis Balompié", "Real Betis"],
  ["Racing Santander", "Real Racing Club"],
  ["Deportivo de La Coruña", "RC Deportivo"],
  ["Sporting Gijón", "Real Sporting"]
]);

function normalizeTeam(name) {
  if (!name) return name;
  const key = String(name).trim();
  return TEAM_MAP.get(key) ?? key;
}

// ---------- Helpers ----------
function to24h(timeStr) {
  if (!timeStr) return "";
  const m = timeStr.trim().match(/(\d{1,2}):(\d{2})(?:\s?(AM|PM))?/i);
  if (!m) return timeStr.trim();
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && hh < 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;
  return `${String(hh).padStart(2, "0")}:${mm}`;
}

function toHHmmss(hhmm) {
  if (!hhmm) return "";
  return /^\d{2}:\d{2}$/.test(hhmm) ? `${hhmm}:00` : hhmm;
}

function parseDateDDMMYYYY(s) {
  const m = (s || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  return `${dd}/${mm}/${yyyy}`; // salida final dd/MM/yyyy
}

function parseAttendance(s) {
  if (!s) return "";
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? String(n) : "";
}

function cleanText($el) {
  return $el.text().replace(/\s+/g, " ").trim();
}

// Devuelve el nombre largo del equipo desde la celda de nombre,
// ignorando enlaces de foro (Go to matchday thread) y cogiendo
// el <a href="/.../spielplan/verein/{id}/..."> (o su title).
function getTeamNameFromCell($, $cell) {
  // Preferir el <a> con href que incluya "/spielplan/verein/"
  const link = $cell.find('a[href*="/spielplan/verein/"]').first();
  if (link.length) {
    const title = link.attr("title");
    const txt = cleanText(link);
    return (title && title.trim()) || txt;
  }
  // Fallback: toma el primer <a> cuyo title no sea "Go to matchday thread"
  const link2 = $cell
    .find('a[title]:not([title*="Go to matchday thread"])')
    .first();
  if (link2.length) {
    const title = link2.attr("title");
    const txt = cleanText(link2);
    return (title && title.trim()) || txt;
  }
  // Último recurso: texto plano de la celda sin etiquetas
  const plain = $cell
    .clone()
    .find("a, img, span.tabellenplatz")
    .remove()
    .end()
    .text();
  const cleaned = plain.replace(/\s+/g, " ").trim();
  return cleaned || cleanText($cell);
}

function parseResultText(text) {
  const m = (text || "").match(/(\d+):(\d+)/);
  if (!m) return { home_goals: "", away_goals: "" };
  return { home_goals: m[1], away_goals: m[2] };
}

// ----------- HTTP con reintentos y backoff -----------
async function fetchHtml(url, { tries = 5, baseDelayMs = 1500 } = {}) {
  let lastErr = null;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await axios.get(url, {
        headers: {
          "user-agent": UA,
          "accept-language": "en-US,en;q=0.9,es;q=0.8",
          "referer": "https://www.transfermarkt.com/",
          "cache-control": "no-cache"
        },
        timeout: TIMEOUT_MS,
        // axios ya gestiona gzip/deflate/br
        responseType: "text",
        validateStatus: (s) => s >= 200 && s < 400 // 3xx OK porque TM a veces redirige
      });
      return res.data;
    } catch (err) {
      lastErr = err;
      // si es 429/503/timeout o ECONNABORTED, backoff más largo
      const code = err?.response?.status;
      const isRetryable =
        code === 429 || code === 503 || code === 502 || code === 403 || err?.code === "ECONNABORTED";
      const delay = Math.round(baseDelayMs * Math.pow(2, i - 1)) + Math.floor(Math.random() * 500);
      if (i < tries && isRetryable) {
        console.warn(`   intento ${i}/${tries} falló (${code || err.code || err.message}); reintentando en ${delay} ms…`);
        await sleep(delay);
        continue;
      }
      break;
    }
  }
  throw lastErr || new Error("fetchHtml failed");
}

// ---------- Parser de un box (partido) ----------
function parseMatchBox($, box, spieltag) {
  const $box = $(box);
  const $firstTr = $box.find("tr.table-grosse-schrift").first();
  if ($firstTr.length === 0) return null;

  // Celdas de nombres de equipo
  const $homeCell = $firstTr.find("td.spieltagsansicht-vereinsname.rechts").first();
  const $awayCell = $firstTr
    .find("td.spieltagsansicht-vereinsname")
    .not(".rechts")
    .last();

  // Nombres (limpia "Go to matchday thread") + normalización
  const home_team = normalizeTeam(getTeamNameFromCell($, $homeCell));
  const away_team = normalizeTeam(getTeamNameFromCell($, $awayCell));

  // Resultado
  const resultText = cleanText(
    $firstTr.find("td.spieltagsansicht-ergebnis .matchresult").first()
  );
  const { home_goals, away_goals } = parseResultText(resultText);

  // Fecha y hora
  const $dateRow = $box
    .find("tr")
    .filter((_, tr) => /\d{2}\/\d{2}\/\d{4}/.test(cleanText($(tr))))
    .first();

  let dateOut = "";
  let timeOut = "";
  if ($dateRow.length) {
    const raw = cleanText($dateRow);
    const dateMatch = raw.match(/(\d{2}\/\d{2}\/\d{4})/);
    const timeMatch = raw.match(/(\d{1,2}:\d{2}\s?(AM|PM)?)/i);
    if (dateMatch) dateOut = parseDateDDMMYYYY(dateMatch[1]);
    if (timeMatch) timeOut = toHHmmss(to24h(timeMatch[1]));
  }

  // Asistencia
  const $attRow = $box
    .find("tr")
    .filter((_, tr) => $(tr).find(".icon-zuschauer-zahl").length > 0)
    .first();

  let attendance = "";
  if ($attRow.length) {
    const raw = cleanText($attRow);
    const m = raw.match(/(\d{1,3}(?:\.\d{3})+|\d{3,})/);
    if (m) attendance = parseAttendance(m[1]);
  }

  // Filtrar cajas que no son partido real (por si algo se cuela)
  if (!home_team || !away_team || !resultText) return null;

  return {
    season: SEASON,
    spieltag,
    date: dateOut,
    time: timeOut,
    home_team,
    away_team,
    home_goals,
    away_goals,
    attendance
  };
}

async function fetchSpieltag(competition, spieltag) {
  const url = `${BASE}/laliga/spieltag/wettbewerb/${competition}/plus/?saison_id=${SEASON}&spieltag=${spieltag}`;
  const html = await fetchHtml(url, { tries: 5, baseDelayMs: 1500 });
  const $ = cheerio.load(html);

  // Partidos: .box que contienen <table> (otras .box son cabeceras)
  const boxes = $(".box > table").closest(".box").toArray();
  const rows = [];
  for (const box of boxes) {
    const m = parseMatchBox($, box, spieltag);
    if (m) rows.push(m);
  }
  return rows;
}

function toCsv(rows) {
  const header = [
    "season",
    "spieltag",
    "date",
    "time",
    "home_team",
    "away_team",
    "home_goals",
    "away_goals",
    "attendance"
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const vals = header.map((k) => {
      const v = r[k] ?? "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    });
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

async function runCompetition(competition, maxSpieltag, outfile) {
  if (!maxSpieltag || maxSpieltag < 1) return;
  const all = [];
  for (let s = 1; s <= maxSpieltag; s++) {
    console.log(`[${competition}] jornada ${s}…`);
    const rows = await fetchSpieltag(competition, s);
    console.log(`   partidos: ${rows.length}`);
    all.push(...rows);
    // delay extra entre jornadas para evitar rate limit
    await sleep(1500 + Math.floor(Math.random() * 700));
  }
  const csv = toCsv(all);
  const outPath = path.resolve(process.cwd(), outfile);
  fs.writeFileSync(outPath, csv, "utf8");
  console.log(`✔ ${competition} → ${outPath} (${all.length} filas)`);
}

(async () => {
  try {
    await runCompetition("ES1", MAX_ES1, OUT_ES1);
    if (MAX_ES2 && OUT_ES2) {
      await runCompetition("ES2", MAX_ES2, OUT_ES2);
    }
  } catch (err) {
    console.error("ERROR:", err?.message || err);
    process.exit(1);
  }
})();
