const fs = require('fs');
const https = require('https');
const path = require('path');

const USERNAME = 'Vishnu3568';
const README_PATH = path.join(__dirname, '..', 'README.md');

function fetchGitHubActivity() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/users/${USERNAME}/events/public`,
      method: 'GET',
      headers: {
        'User-Agent': 'github-profile-readme-updater',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse response JSON'));
          }
        } else if (res.statusCode === 403) {
          reject(new Error('Rate limit exceeded or forbidden'));
        } else {
          reject(new Error(`API returned status code ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

function formatActivity(events) {
  if (!events || !events.length) {
    return '  No recent public activity found.\n';
  }

  // Filter and take first 5 relevant events
  const activityLines = [];
  let count = 0;

  for (const event of events) {
    if (count >= 5) break;

    const timeString = new Date(event.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let message = '';
    const repoName = event.repo.name.replace(`${USERNAME}/`, '');

    switch (event.type) {
      case 'PushEvent':
        const commitCount = event.payload.commits ? event.payload.commits.length : 0;
        if (commitCount === 0) continue;
        const commitMsg = event.payload.commits[0].message.split('\n')[0];
        const plural = commitCount > 1 ? 's' : '';
        message = `📝 Pushed ${commitCount} commit${plural} to \`${repoName}\` - *"${commitMsg}"*`;
        break;
      case 'CreateEvent':
        const refType = event.payload.ref_type;
        message = `🆕 Created ${refType} \`${event.payload.ref || repoName}\` in repository`;
        break;
      case 'PullRequestEvent':
        const prAction = event.payload.action;
        const prTitle = event.payload.pull_request.title;
        message = `🔀 ${prAction.charAt(0).toUpperCase() + prAction.slice(1)} Pull Request in \`${repoName}\` - *"${prTitle}"*`;
        break;
      case 'IssuesEvent':
        const issueAction = event.payload.action;
        const issueTitle = event.payload.issue.title;
        message = `🐛 ${issueAction.charAt(0).toUpperCase() + issueAction.slice(1)} issue in \`${repoName}\` - *"${issueTitle}"*`;
        break;
      case 'WatchEvent':
        message = `⭐ Starred repository \`${event.repo.name}\``;
        break;
      default:
        // Skip uninteresting event types
        continue;
    }

    activityLines.push(`| \`[${timeString}]\` | ${message} |`);
    count++;
  }

  if (activityLines.length === 0) {
    return '| Date | Activity Log |\n| :--- | :--- |\n| - | No recent public commits or activities |';
  }

  return [
    '| Timestamp | Activity Detail |',
    '| :--- | :--- |',
    ...activityLines
  ].join('\n');
}

async function updateReadme() {
  try {
    console.log(`Fetching activity for ${USERNAME}...`);
    const events = await fetchGitHubActivity();
    const formattedLog = formatActivity(events);

    if (!fs.existsSync(README_PATH)) {
      console.error(`Error: README.md not found at ${README_PATH}`);
      return;
    }

    let readmeContent = fs.readFileSync(README_PATH, 'utf8');

    const startTag = '<!-- START_ACTIVITY -->';
    const endTag = '<!-- END_ACTIVITY -->';

    const startIdx = readmeContent.indexOf(startTag);
    const endIdx = readmeContent.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) {
      console.log('Activity placeholders not found in README.md. Skipping rewrite.');
      return;
    }

    const updatedContent = 
      readmeContent.substring(0, startIdx + startTag.length) +
      '\n\n' + formattedLog + '\n\n' +
      readmeContent.substring(endIdx);

    fs.writeFileSync(README_PATH, updatedContent, 'utf8');
    console.log('README.md updated successfully with latest GitHub activity!');
  } catch (error) {
    console.error('Error updating README.md:', error.message);
  }
}

updateReadme();
