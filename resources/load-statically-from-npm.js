'use strict';

const fs = require('fs');

const ts = require('typescript');

/**
 * Transforms:
 *
 *  loadFileStaticallyFromNPM(<npm path>)
 *
 * to:
 *
 *  "<file content>"
 */
module.exports.transformLoadFileStaticallyFromNPM = function (context) {
  return fun