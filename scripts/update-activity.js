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
    return '| Timestamp | CLI Command / Activity |\n| :--- | :--- |\n| `[n/a]` | `echo "No recent activity detected."` |\n';
  }

  const activityLines = [];
  let count = 0;

  for (const event of events) {
    if (count >= 5) break;

    const date = new Date(event.created_at);
    const timeString = date.toLocaleDateString('en-US', {
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
        const commitMsg = event.payload.commits[0].message.split('\n')[0].replace(/"/g, '\\"');
        const branch = event.payload.ref.replace('refs/heads/', '');
        message = `\`git push origin ${branch}\` <br> _↳ commit: "${commitMsg}" (${commitCount} total)_`;
        break;
      case 'CreateEvent':
        const refType = event.payload.ref_type;
        if (refType === 'repository') {
          message = `\`git init ${repoName}\` <br> _↳ Initialized new repository_`;
        } else {
          const ref = event.payload.ref;
          message = `\`git checkout -b ${ref}\` <br> _↳ Created ${refType} in ${repoName}_`;
        }
        break;
      case 'PullRequestEvent':
        const prAction = event.payload.action;
        const prNum = event.payload.number;
        const prTitle = event.payload.pull_request.title.replace(/"/g, '\\"');
        message = `\`gh pr ${prAction === 'closed' ? 'close' : prAction} #${prNum}\` <br> _↳ "${prTitle}" in ${repoName}_`;
        break;
      case 'IssuesEvent':
        const issueAction = event.payload.action;
        const issueNum = event.payload.issue.number;
        const issueTitle = event.payload.issue.title.replace(/"/g, '\\"');
        message = `\`gh issue ${issueAction} #${issueNum}\` <br> _↳ "${issueTitle}" in ${repoName}_`;
        break;
      case 'WatchEvent':
        message = `\`gh repo fork ${event.repo.name}\` <br> _↳ Starred and tracked project_`;
        break;
      default:
        continue;
    }

    activityLines.push(`| \`[${timeString}]\` | ${message} |`);
    count++;
  }

  if (activityLines.length === 0) {
    return '| Timestamp | CLI Command / Activity |\n| :--- | :--- |\n| `[n/a]` | `echo "No recent git/gh events."` |';
  }

  return [
    '| Timestamp | CLI Command / Activity |',
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
