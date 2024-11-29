#!/usr/bin/env node
import path from 'path';
import fs from 'fs-extra';
import minimist from 'minimist';
import { getFunctionData } from '../functionScanner';
import { updateDocs } from '../updateDocs';

async function main() {
  const args = minimist(process.argv.slice(2));
  const outputDir = args.output || 'docs/codexMaker';
  const targetDir = path.resolve(process.cwd(), outputDir);

  if (!await fs.pathExists(targetDir)) {
    console.error(`Documentation directory not found at ${targetDir}. Please run generate-docs first.`);
    process.exit(1);
  }

  console.log('Scanning for functions...');
  const functionData = await getFunctionData(process.cwd());

  if (functionData.length === 0) {
    console.log('No functions found in the codebase. Update aborted.');
    return;
  }

  console.log(`Found ${functionData.length} functions to process`);
  await updateDocs(functionData, targetDir);
}

main().catch(error => {
  console.error('Error during documentation update:', error);
  process.exit(1);
});