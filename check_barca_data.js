const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'public/data/stadium_full_data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const stadiums = JSON.parse(rawData);

const barcaStadiums = stadiums.filter(s =>
    (s.team_primary && s.team_primary.includes('Barcelona')) ||
    (s.team_sec && s.team_sec.includes('Barcelona')) ||
    (s.stadium_name && s.stadium_name.toLowerCase().includes('camp nou')) ||
    (s.stadium_name && s.stadium_name.toLowerCase().includes('lluis')) ||
    (s.stadium_name && s.stadium_name.toLowerCase().includes('johan'))
);

fs.writeFileSync('barca_stadiums.json', JSON.stringify(barcaStadiums, null, 2));
