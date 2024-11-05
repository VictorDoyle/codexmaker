import fs from 'fs-extra';
import path from 'path';

interface FunctionData {
  name: string;
  params: string[];
  filePath: string;
}

/**
 * Generates documentation files based on the provided function data.
 * 
 * @param functionData - Array of function data to generate documentation for.
 * @param outputDir - The output directory where the documentation will be saved.
 */
async function generateDocs(functionData: FunctionData[], outputDir: string): Promise<void> {
  const functionsDir = path.join(outputDir, 'functions');
  await fs.ensureDir(functionsDir);

  const indexPath = path.join(outputDir, 'index.mdx');
  if (!(await fs.pathExists(indexPath))) {
    await generateIndexPage(functionData, outputDir);
  }

  // individual function documentation
  await Promise.all(functionData.map(async (func) => {
    const docPath = path.join(functionsDir, `${func.name}.mdx`);
    //FIXME: This isnt good long-term, if a user changes the function, the update won't be automatically added to docs -- this is a pretty bad design so this is P2
    if (await fs.pathExists(docPath)) return; // skip existing files 


    const content = generateFunctionDocContent(func);
    await fs.writeFile(docPath, content);
  }));

  console.log(`Documentation files generated in ${outputDir}`);
}

/**
 * Generates the index page content for the documentation.
 * 
 * @param functionData - Array of function data to include in the index.
 * @param outputDir - The output directory where the index page will be saved.
 */
async function generateIndexPage(functionData: FunctionData[], outputDir: string): Promise<void> {
  const indexContent = `# Function Index\n\n${functionData
    .map((func) => `- [${func.name}](./functions/${func.name}.mdx)`)
    .join('\n')}`;

  await fs.writeFile(path.join(outputDir, 'index.mdx'), indexContent);
}

/**
 * Generates the content for a function documentation file.
 * 
 * @param func - The function data for which to generate the documentation.
 * @returns The MDX content as a string.
 */
function generateFunctionDocContent(func: FunctionData): string {
  /* TODO: hacky approach but ideally move this into a template.mdx with literal call-in */
  return `
---
title: ${func.name}
description: Documentation for ${func.name}
---

# ${func.name}

**File**: \`${func.filePath}\`

## Parameters

${func.params.map((p) => `- ${p}`).join('\n')}

## Description

_TODO: Add description_
    `.trim();
}

export default generateDocs;
