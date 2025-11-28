const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/data/spain_map.json', 'utf8'));

const yearCounts = {};
const regions2022 = [];

data.features.forEach(f => {
    const year = f.properties.year;
    const name = f.properties.acom_name;

    if (!yearCounts[year]) {
        yearCounts[year] = 0;
    }
    yearCounts[year]++;

    if (year === "2022") {
        regions2022.push(name);
    }
});

console.log("Year counts:", yearCounts);
console.log("Regions in 2022:", regions2022);
