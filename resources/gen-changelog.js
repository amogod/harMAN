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

  const