const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/data/spain_map.json', 'utf8'));

data.features.forEach(f => {
    if (f.properties.year === "2022") {
        console.log(`${f.properties.acom_name}: ${f.geometry.type}`);
    }
});
