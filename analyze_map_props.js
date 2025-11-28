const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/data/spain_map.json', 'utf8'));

data.features.forEach(f => {
    if (f.properties.acom_name === "Illes Balears" && f.properties.year === "2022") {
        console.log("Baleares props:", f.properties);
    }
    if (f.properties.acom_name === "Comunidad de Madrid" && f.properties.year === "2022") {
        console.log("Madrid props:", f.properties);
    }
});
