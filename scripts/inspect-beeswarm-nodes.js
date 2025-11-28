const fs = require('fs');
const path = require('path');

function key(s){
  if(!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

// load JSON files
const homePath = path.join(__dirname, '..', 'public', 'data', 'home_metrics.json');
const fullPath = path.join(__dirname, '..', 'public', 'data', 'stadium_full_data.json');
const tmPath = path.join(__dirname, '..', 'src', 'utils', 'teamMappings.ts');

const home = JSON.parse(fs.readFileSync(homePath, 'utf8'));
const full = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const tmRaw = fs.readFileSync(tmPath, 'utf8');

// parse TEAM_MAPPINGS entries: "Key": { displayName: "...", slug: "..." },
const mapping = {};
const re = /\"([^\"]+)\"\s*:\s*\{\s*displayName:\s*\"([^\"]+)\",\s*slug:\s*\"([^\"]+)\"\s*\}/g;
let m;
while((m = re.exec(tmRaw))){
  mapping[m[1]] = { displayName: m[2], slug: m[3] };
}

function getTeamDisplayName(teamName){
  return mapping[teamName] ? mapping[teamName].displayName : teamName;
}

function resolveTeamName(node){
  const stadium = (node.stadium_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const baseTeam = (node.team_primary || '').trim();
  const isBarcaStadium = stadium.includes('camp nou') || stadium.includes('spotify camp nou') || (stadium.includes('lluis') && stadium.includes('companys')) || (stadium.includes('olimpic') && stadium.includes('lluis')) || (stadium.includes('johan') && stadium.includes('cruyf'));
  if(isBarcaStadium) return 'FC Barcelona';
  if(baseTeam !== '') return baseTeam;
  return 'Unknown';
}

// merge home.all_stadiums with full if missing
const merged = [...home.all_stadiums];
full.forEach(s=>{
  const exists = merged.some(m=> (m.stadium_name||'').toLowerCase() === (s.stadium_name||'').toLowerCase());
  if(!exists){
    merged.push({stadium_name: s.stadium_name, team_primary: s.team_primary, capacity: s.capacity, att_avg: s.att_avg||0, occ_avg_pct: s.occ_avg_pct||0, matches: s.matches||0});
  }
});

// compute logoTeamName for each and list ones for Sporting, Burgos, Huesca and any missing logos (not present in mapping)
const targets = ['Real Sporting','Burgos CF','SD Huesca'];

console.log('stadium_name | team_primary | resolved | displayName | mapped? | slug');
merged.forEach(s=>{
  const resolved = resolveTeamName(s);
  const display = getTeamDisplayName(resolved);
  const mapped = Object.prototype.hasOwnProperty.call(mapping, resolved);
  const slug = mapped ? mapping[resolved].slug : (resolved.toLowerCase().replace(/\s+/g,'-'));
  if(targets.includes(resolved) || targets.includes(display) || !mapped){
    console.log(`${s.stadium_name} | ${s.team_primary || ''} | ${resolved} | ${display} | ${mapped} | ${slug}`);
  }
});

// Also print counts
console.log('\nCounts:');
console.log('total merged stadiums:', merged.length);

// show duplicates for those target resolved names
targets.forEach(t=>{
  const list = merged.filter(s=> resolveTeamName(s) === t).map(s=>s.stadium_name);
  console.log(`${t}: ${list.length} stadium(s): ${list.join('; ')}`);
});
