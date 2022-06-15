'use strict';

const util = require('util');
const https = require('https');

// eslint-disable-next-line import/extensions
const packageJSON = require('../package.json');

const { exec } = require('./utils');

const graphqlRequest = util.promisify(graphqlRequestImpl);
const labelsConfig = {
  'PR: breaking change 💥': {
    section: 'Breaking Change 💥',
  },
  'PR: feature 🚀': {
    section: 'New Feature 🚀',
  },
  'PR: bug fix 🐞': {
    section: 'Bug Fix 🐞',
  },
  'PR: docs 📝': {
    section: 'Docs 📝',
    fold: true,
  },
  'PR: polish 💅': {
    section: 'Polish 💅',
    fold: true,
  },
  'PR: internal 🏠': {
    section: 'Internal 🏠',
    fold: true,
  },
  'PR: dependency 📦': {
    section: 'Dependency 📦',
    fold: true,
  },
};
const { GH_TOKEN } = process.env;

if (!GH_TOKEN) {
  console.error('Must provide GH_TOKEN as environment variable!');
  process.exit(1);
}

if (!packageJSON.repository || typeof packageJSON.repository.url !== 'string') {
  console.error('package.json is missing repository.url string!');
  process.exit(1);
}

const repoURLMatch =
  /https:\/\/github.com\/(?<githubOrg>[^/]+)\/(?<githubRepo>[^/]+).git/.exec(
    packageJSON.repository.url,
  );
if (repoURLMatch == null) {
  console.error('Cannot extract organization and repo name from repo URL!');
  process.exit(1);
}
const { githubOrg, githubRepo } = repoURLMatch.groups;

getChangeLog()
  .then((changelog) => process.stdout.write(changelog))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function getChangeLog() {
  const { version } = packageJSON;

  let tag = null;
  let commitsList = exec(`git rev-list --reverse v${version}..`);
  if (commitsList === '') {
    const parentPackageJSON = exec('git cat-file blob HEAD~1:package.json');
    const parentVersion = JSON.parse(parentPackageJSON).version;
    commitsList = exec(`git rev-list --reverse v${parentVersion}..HEAD~1`);
    tag = `v${version}`;
  }

  const date = exec('git log -1 --format=%cd --date=short');
  return getCommitsInfo(commitsList.split('\n'))
    .then((commitsInfo) => getPRsInfo(commitsInfoToPRs(commitsInfo)))
    .then((prsInfo) => genChangeLog(tag, date, prsInfo));
}

function genChangeLog(tag, date, allPRs) {
  const byLabel = {};
  const committersByLogin = {};

  for (const pr of allPRs) {
    const labels = pr.labels.nodes
      .map((label) => label.name)
      .filter((label) => label.startsWith('PR: '));

    if (labels.length === 0) {
      throw new Error(`PR is missing label. See ${pr.url}`);
    }
    if (labels.length > 1) {
      throw new Error(
        `PR has conflicting labels: ${labels.join('\n')}\nSee ${pr.url}`,
      );
    }

    const label = labels[0];
    if (!labelsConfig[label]) {
      throw new Error(`Unknown label: ${label}. See ${pr.url}`);
    }
    byLabel[label] = byLabel[label] || [];
    byLabel[label].push(pr);
    committersByLogin[pr.author.login] = pr.author;
  }

  let changelog = `## ${tag || 'Unreleased'} (${date})\n`;
  for (const [label, config] of Object.entries(labelsConfig)) {
    const prs = byLabel[label];
    if (prs) {
      const shouldFold = config.fold && prs.length > 1;

      changelog += `\n#### ${config.section}\n`;
      if (shouldFold) {
        changelog += '<details>\n';
        changelog += `<summary> ${prs.length} PRs were merged </summary>\n\n`;
      }

      for (const pr of prs) {
        const { number, url, author } = pr;
        changelog += `* [#${number}](${url}) ${pr.title} ([@${author.login}](${author.url}))\n`;
      }

      if (shouldFold) {
        changelog += '</details>\n';
      }
    }
  }

  const committers = Object.values(committersByLogin).sort((a, b) =>
    (a.name || a.login).localeCompare(b.name || b.login),
  );
  changelog += `\n#### Committers: ${committers.length}\n`;
  for (const committer of committers) {
    changelog += `* ${committer.name}([@${committer.login}](${committer.url}))\n`;
  }

  return changelog;
}

function graphqlRequestImpl(query, variables, cb) {
  const resultCB = typeof variables === 'function' ? variables : cb;

  const req = https.request('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: 'bearer ' + GH_TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': 'gen-changelog',
    },
  });

  req.on('response', (res) => {
    let responseBody = '';

    res.setEncoding('utf8');
    res.on('data', (d) => (responseBody += d));
    res.on('error', (error) => resultCB(error));

    res.on('end', () => {
      if (res.statusCode !== 200) {
        return resultCB(
          new Error(
            `GitHub responded with ${res.statusCode}: ${res.statusMessage}\n` +
              responseBody,
          ),
        );
      }

      let json;
      try {
        json = JSON.parse(responseBody);
      } catch (error) {
        return resultCB(error);
      }

      if (json.errors) {
        return resultCB(
          new Error('Errors: ' + JSON.stringify(json.errors, null, 2)),
        );
      }

      resultCB(undefined, json.data);
    });
  });

  req.on('error', (error) => resultCB(error));
  req.write(JSON.stringify({ query, variables }));
  req.end();
}

async function batchCommitInfo(commits) {
  let commitsSubQuery = '';
  for (const oid of commits) {
    commitsSubQ