const fs = require('fs');
const https = require('https');
const path = require('path');

const USERNAME = 'Vishnu3568';
const STREAK_SVG_PATH = path.join(__dirname, '..', 'assets', 'streak_stats.svg');
const STREAK_URL = `https://streak-stats.demolab.com/?user=${USERNAME}&theme=dark&background=0D1117&ring=A970FF&fire=A970FF&currStreakNum=58A6FF&sideNums=58A6FF&sideLabels=F0F6FC&dates=8B949E&currStreakLabel=58A6FF&border=30363D&stroke=30363D`;

function fetchStreakSvg() {
  return new Promise((resolve, reject) => {
    const req = https.get(STREAK_URL, { headers: { 'User-Agent': 'github-actions-profile-updater' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 && !data.includes('Failed to retrieve') && !data.includes('Something went wrong')) {
          resolve(data);
        } else {
          reject(new Error(`API returned status ${res.statusCode} or error response payload.`));
        }
      });
    });

    req.on('error', (err) => reject(err));
  });
}

async function updateStreak() {
  try {
    console.log(`Fetching latest GitHub streak stats for ${USERNAME}...`);
    const svgData = await fetchStreakSvg();

    const assetsDir = path.dirname(STREAK_SVG_PATH);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    fs.writeFileSync(STREAK_SVG_PATH, svgData, 'utf8');
    console.log('Successfully updated assets/streak_stats.svg!');
  } catch (error) {
    console.warn('Warning: Could not fetch new streak SVG:', error.message);
    if (fs.existsSync(STREAK_SVG_PATH)) {
      console.log('Retaining existing assets/streak_stats.svg as fallback.');
    } else {
      console.error('Error: No existing streak SVG found to fallback on.');
    }
  }
}

updateStreak();
