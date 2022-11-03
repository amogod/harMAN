'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const childProcess = require('child_process');

function exec(command, options) {
  const output = childProcess.execSync(command, {
    maxBuffer: 10 * 1024 * 1024, // 10MB
    encoding: 'utf-8',
    ...options,
  });
  return removeTrailingNewLine(output);
}

const childProcessExec = util.promisify(childProcess.exec);
async function execAsync(command, options) {
  const output = await childProcessExec(command, {
    maxBuffer: 10 * 1024 * 1024, // 10MB
    encoding: 'utf-8',
    ...options,
  });
  return removeTrailingNewLine(output.stdout);
}

function removeTrailingNewLine(str) {
  if (str == null) {
    return str;
  }

  return str.split('\n').slice(0, -1).join('\n');
}

function rmdirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, dirent.name);
      if (dirent.isDirectory()) {
        rmdirRecursive(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    fs.rmdirSync(dirPath);
  }
}

function readdirRecursive(dirPath, opts = {}) {
  const { ignoreDir } = opts;
  const result = [];
  for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const name = dirent.name;
    if (!dirent.isDirectory()) {
      result.push(dirent.name);
      continue;
    }

    if (ignoreDir && ignoreDir.test(name)) {
      continue;
    }
    const list = readdirRecursive(path.join(dirPath, name), opts).map((f) =>
      path.join(name, f),
    );
    result.push(...list);
  }
  return result;
}

function showDirStats(dirPath) {
  const fileTypes = {};
  let totalSize = 0;

  for (const filepath of readdirRecursive(dirPath)) {
    const name = filepath.split(path.sep).pop();
    const [base, ...splitExt] = name.split('.');
    const ext = splitExt.join('.');

    const filetype = ext ? '*.' + ext : base;
    fileTypes[filetype] = fileTypes[filetype] || { filepaths: [], size: 0 };

    const { size } = fs.lstatSync(path.join(dirPath, filepath));
    totalSize += size;
    fileTypes[filetype].size += size;
    fileTypes[filetype].filepaths.push(filepath);
  }

  let stats = [];
  for (const [filetype, typeStats] of Object.entries(fileTypes)) {
    const numFiles = typeStats.filepaths.length;

    if (num