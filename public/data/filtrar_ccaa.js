// filtrar_ccaa.js
// node filtrar_ccaa.js Spain.json ccaa_only.geojson

const fs = require("fs");

const inPath = process.argv[2];
const outPath = process.argv[3] || "ccaa_only.geojson";

if (!inPath) {
    console.error("Uso: node filtrar_ccaa.js Spain.json ccaa_only.geojson");
    process.exit(1);
}

const raw = fs.readFileSync(inPath, "utf8");
const geo = JSON.parse(raw);

// Ajusta estos nombres si en tu fichero las props se llaman distinto
const features = geo.features.filter((f) => {
    const p = f.properties || {};
    // En el Spain.json de ese repo las CCAA suelen venir marcadas como "Autonomous Community"
    return (
        p.type === "Autonomous Community" ||
        p.admin_level === "Comunidades Autónomas" || // por si acaso
        p.level === "autonomous_community"
    );
});

const out = {
    type: "FeatureCollection",
    features,
};

fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`OK → ${features.length} CCAA guardadas en ${outPath}`);
