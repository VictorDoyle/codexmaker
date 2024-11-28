#!/usr/bin/env node
import path from 'path';
import fs from 'fs-extra';
import minimist from 'minimist';
import generateDocs from './generateDocs';
import { getFunctionData } from './functionScanner';
import setupNextra from './nextraSetup';
import { availableParsers } from './parsers';

async function main() {
  const args = minimist(process.argv.slice(2));
  const outputDir = args.output || 'docs/codexMaker';
  const targetDir = path.resolve(process.cwd(), outputDir);
  const baseDir = process.cwd();

  console.log('Available parsers:', availableParsers.map(p => p.getLanguageId()));

  await fs.ensureDir(targetDir);

  // don't override pre-existing
  const existingFiles = await fs.readdir(targetDir);
  if (existingFiles.length > 0) {
    console.log(`Warning: ${targetDir} is not empty. Skipping existing files.`);
    return;
  }

  console.log('Scanning for functions...');
  const functionData = await getFunctionData(baseDir);

  if (functionData.length === 0) {
    console.log('No functions found in the codebase. Documentation generation aborted.');
    return;
  }

  console.log(`Found ${functionData.length} functions to document`);
  await generateDocs(functionData, targetDir);
  await setupNextra(targetDir);
}

main().catch(error => {
  console.error('Error during documentation generation:', error);
  process.exit(1);
});