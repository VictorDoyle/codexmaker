#!/usr/bin/env node
import path from 'path';
import fs from 'fs-extra';
import minimist from 'minimist';
import generateDocs from './generateDocs';
import { getFunctionData } from './functionScanner';
import setupNextra from './nextraSetup';

async function main() {
  const args = minimist(process.argv.slice(2));
  const outputDir = args.output || 'docs/codexMaker';
  const targetDir = path.resolve(process.cwd(), outputDir);
  const baseDir = process.cwd();

  await fs.ensureDir(targetDir);


  // dont override pre-existing
  const existingFiles = await fs.readdir(targetDir);
  if (existingFiles.length > 0) {
    console.log(`Warning: ${targetDir} is not empty. Skipping existing files.`);
    return; //TODO: later check contents but v2
  }

  const functionData = await getFunctionData(baseDir);
  if (functionData.length === 0) {
    console.log('No functions found in the codebase. Documentation generation aborted.');
    return;
  }

  await generateDocs(functionData, targetDir);
  await setupNextra(targetDir);

  console.log(`Documentation successfully generated in ${targetDir}`);
}

main().catch(error => {
  console.error('Error during documentation generation:', error);
});
