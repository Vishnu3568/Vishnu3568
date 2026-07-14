const fs = require('fs');
const path = require('path');

const USERNAME = 'Vishnu3568';
const EVENT_LIMIT = 5;

async function fetchActivity() {
  try {
    const response = await fetch(`https://api.github.com/users/${USERNAME}/events/public`, {
      headers: {
        'User-Agent': 'node-fetch-github-activity-script'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const events = await response.json();
    const formattedEvents = [];
    const seenEvents = new Set();

    for (const event of events) {
      if (formattedEvents.length >= EVENT_LIMIT) break;

      let msg = '';
      const repoName = event.repo.name;
      const repoUrl = `https://github.com/${repoName}`;

      switch (event.type) {
        case 'PushEvent': {
          const commitCount = event.payload.commits ? event.payload.commits.length : 1;
          const branch = event.payload.ref.replace('refs/heads/', '');
          msg = `📝 Pushed **${commitCount} commit(s)** to [\`${repoName}\`](${repoUrl}) on branch \`${branch}\``;
          break;
        }
        case 'PullRequestEvent': {
          const action = event.payload.action;
          const prTitle = event.payload.pull_request.title;
          const prUrl = event.payload.pull_request.html_url;
          msg = `🔀 ${action === 'opened' ? 'Opened' : 'Closed'} Pull Request: [${prTitle}](${prUrl}) in [\`${repoName}\`](${repoUrl})`;
          break;
        }
        case 'IssuesEvent': {
          const action = event.payload.action;
          const issueTitle = event.payload.issue.title;
          const issueUrl = event.payload.issue.html_url;
          msg = `🐛 ${action === 'opened' ? 'Opened' : 'Closed'} Issue: [${issueTitle}](${issueUrl}) in [\`${repoName}\`](${repoUrl})`;
          break;
        }
        case 'WatchEvent': {
          msg = `⭐️ Starred repository [\`${repoName}\`](${repoUrl})`;
          break;
        }
        case 'CreateEvent': {
          const refType = event.payload.ref_type;
          msg = `🚀 Created new ${refType}: [\`${repoName}\`](${repoUrl})`;
          break;
        }
      }

      if (msg && !seenEvents.has(msg)) {
        seenEvents.add(msg);
        formattedEvents.push(msg);
      }
    }

    if (formattedEvents.length === 0) {
      return '*No recent public activity discovered.*';
    }

    return formattedEvents.map(e => `- ${e}`).join('\n');
  } catch (error) {
    console.error('Error fetching activity:', error);
    return null;
  }
}

async function updateReadme() {
  const readmePath = path.join(__dirname, '..', 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found');
    return;
  }

  const activity = await fetchActivity();
  if (!activity) {
    console.log('No activity fetched or error occurred. Skipping update.');
    return;
  }

  let readmeContent = fs.readFileSync(readmePath, 'utf8');
  const startTag = '<!-- ACTIVITY_START -->';
  const endTag = '<!-- ACTIVITY_END -->';

  const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`, 'g');
  const newContent = `${startTag}\n${activity}\n${endTag}`;

  if (regex.test(readmeContent)) {
    readmeContent = readmeContent.replace(regex, newContent);
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    console.log('README.md successfully updated with latest activity.');
  } else {
    console.error('Activity comment tags not found in README.md');
  }
}

updateReadme();
