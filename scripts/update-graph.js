const fs = require('fs');
const https = require('https');
const path = require('path');

const USERNAME = 'Vishnu3568';
const GRAPH_SVG_PATH = path.join(__dirname, '..', 'assets', 'contribution_graph.svg');
const GRAPH_URL = `https://github-readme-activity-graph.vercel.app/graph?username=${USERNAME}&theme=react-dark&bg_color=0D1117&color=58A6FF&line=A970FF&point=00F2FE&area=true&hide_border=true`;

function fetchGraphSvg() {
  return new Promise((resolve, reject) => {
    const req = https.get(GRAPH_URL, { headers: { 'User-Agent': 'github-actions-profile-updater' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('<svg') && !data.includes('Something went wrong')) {
          resolve(data);
        } else {
          reject(new Error(`API returned status ${res.statusCode} or invalid SVG content.`));
        }
      });
    });

    req.on('error', (err) => reject(err));
  });
}

function polishSvgAnimation(svgString) {
  // Enhance line drawing animation speed and smoothness
  return svgString
    .replace('animation: dash 5s ease-in-out forwards;', 'animation: dash 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;')
    .replace('animation: blink 1s ease-in-out forwards;', 'animation: blink 1.2s ease-in-out forwards;');
}

async function updateGraph() {
  try {
    console.log(`Fetching latest contribution graph SVG for ${USERNAME}...`);
    let svgData = await fetchGraphSvg();
    svgData = polishSvgAnimation(svgData);

    const assetsDir = path.dirname(GRAPH_SVG_PATH);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    fs.writeFileSync(GRAPH_SVG_PATH, svgData, 'utf8');
    console.log('Successfully updated assets/contribution_graph.svg with enhanced animation!');
  } catch (error) {
    console.warn('Warning: Could not fetch new contribution graph SVG:', error.message);
    if (fs.existsSync(GRAPH_SVG_PATH)) {
      console.log('Retaining existing assets/contribution_graph.svg as fallback.');
    } else {
      console.error('Error: No existing contribution graph SVG found to fallback on.');
    }
  }
}

updateGraph();
