const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'public/data/home_metrics.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);
const stadiums = data.all_stadiums || [];

const barcaStadiums = stadiums.filter(s =>
    (s.team_primary && s.team_primary.includes('Barcelona')) ||
    (s.team_sec && s.team_sec.includes('Barcelona')) ||
    (s.stadium_name && s.stadium_name.toLowerCase().includes('camp nou')) ||
    (s.stadium_name && s.stadium_name.toLowerCase().includes('lluis')) ||
    (s.stadium_name && s.stadium_name.toLowerCase().includes('johan'))
);

fs.writeFileSync('barca_metrics.json', JSON.stringify(barcaStadiums, null, 2));
