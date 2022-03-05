'use strict';

const util = require('util');
const https = require('https');

// eslint-disable-next-line import/extensions
const packageJSON = require('../package.json');

const { exec } = require('./utils');

const graphqlRequest = util.promisify(graphqlRequestImpl);
const labelsConfig = {
  'PR: breaking ch