#!/usr/bin/env node
import path from 'path';
import fs from 'fs-extra';
import minimist from 'minimist';
import { getFunctionData } from './functionScanner';
import { shouldProcessFile } from './utils/fileFilter';

interface UpdateSummary {
  added: string[];
  updated: string[];
  unchanged: string[];
  errors: string[];
}

async function updateExistingDoc(mdxPath: string, functionInfo: any, summary: UpdateSummary) {
  const existingContent = await fs.readFile(mdxPath, 'utf-8');
  const { name, code, codeLang, description, parameters, returnType } = functionInfo;

  const sections = parseExistingContent(existingContent);
  const currentCodeSection = extractCodeSection(existingContent);

  if (currentCodeSection === code) {
    summary.unchanged.push(name);
    return;
  }

  const newContent = `
# ${name}

${sections.description || `
## Function Description
${description || 'No description provided.'}`}

## Function Code
<pre><code>
  this is a ${codeLang} lang file
\`\`\`${codeLang} showLineNumbers
  ${code}
  \`\`\`
</code></pre>

${sections.parameters || `
### Parameters
\`\`\`
${parameters && parameters.length > 0
      ? parameters.map((param: { name: string; type: string; description: string }) =>
        `- \`${param.name}\`: ${param.type} - ${param.description}`).join('\n')
      : 'No parameters specified.'}
\`\`\`
`}

${sections.returnValue || `
### Return Value
- Type: \`\`\`${returnType || 'Unknown'} \`\`\`
${description || 'No additional return value description available.'}`}

${sections.usageExample || `
### Usage Example
\`\`\`javascript
Add an example of how to use this function
\`\`\`
`}

${sections.customSections || ''}
  `.trim();

  await fs.writeFile(mdxPath, newContent);
  summary.updated.push(name);
}

async function createNewDoc(mdxPath: string, functionInfo: any, summary: UpdateSummary) {
  const { name, code, codeLang, description, parameters, returnType } = functionInfo;

  const content = `
# ${name}

## Function Description
${description || 'No description provided.'}

## Function Code
<pre><code>
  this is a ${codeLang} lang file
\`\`\`${codeLang} showLineNumbers
  ${code}
  \`\`\`
</code></pre>

### Parameters
\`\`\`
${parameters && parameters.length > 0
      ? parameters.map((param: { name: string; type: string; description: string }) =>
        `- \`${param.name}\`: ${param.type} - ${param.description}`).join('\n')
      : 'No parameters specified.'}
\`\`\`

### Return Value
- Type: \`\`\`${returnType || 'Unknown'} \`\`\`
${description || 'No additional return value description available.'}

### Usage Example
\`\`\`javascript
Add an example of how to use this function
\`\`\`
  `.trim();

  await fs.writeFile(mdxPath, content);
  summary.added.push(name);
}

function parseExistingContent(content: string): {
  description?: string;
  parameters?: string;
  returnValue?: string;
  usageExample?: string;
  customSections?: string;
} {
  const sections: any = {};
  let currentSection = '';
  let customSections = '';

  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## Function Description')) {
      currentSection = 'description';
      sections.description = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('##')) {
        sections.description += lines[i] + '\n';
        i++;
      }
      continue;
    }

    if (line.startsWith('### Parameters')) {
      currentSection = 'parameters';
      sections.parameters = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('###')) {
        sections.parameters += lines[i] + '\n';
        i++;
      }
      continue;
    }

    if (line.startsWith('### Return Value')) {
      currentSection = 'returnValue';
      sections.returnValue = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('###')) {
        sections.returnValue += lines[i] + '\n';
        i++;
      }
      continue;
    }

    if (line.startsWith('### Usage Example')) {
      currentSection = 'usageExample';
      sections.usageExample = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('###')) {
        sections.usageExample += lines[i] + '\n';
        i++;
      }
      continue;
    }

    if (line.startsWith('###') &&
      !line.includes('Parameters') &&
      !line.includes('Return Value') &&
      !line.includes('Usage Example')) {
      customSections += line + '\n';
      i++;
      while (i < lines.length && !lines[i].startsWith('###')) {
        customSections += lines[i] + '\n';
        i++;
      }
      continue;
    }

    i++;
  }

  if (customSections) {
    sections.customSections = customSections;
  }

  return sections;
}

function extractCodeSection(content: string): string {
  const codeMatch = content.match(/```[\w-]+\s+showLineNumbers([\s\S]*?)```/);
  return codeMatch ? codeMatch[1].trim() : '';
}

if (require.main === module) {
  const args = minimist(process.argv.slice(2));
  const outputDir = args.output || 'docs/codexMaker';
  const targetDir = path.resolve(process.cwd(), outputDir);

  (async () => {
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

    const summary: UpdateSummary = {
      added: [],
      updated: [],
      unchanged: [],
      errors: []
    };

    console.log(`Found ${functionData.length} functions to process`);

    const pagesDir = path.join(targetDir, 'pages');
    const functionsDir = path.join(pagesDir, 'functions');
    await fs.ensureDir(functionsDir);

    for (const functionInfo of functionData) {
      const mdxPath = path.join(functionsDir, `${functionInfo.name}.mdx`);

      try {
        if (await fs.pathExists(mdxPath)) {
          await updateExistingDoc(mdxPath, functionInfo, summary);
        } else {
          await createNewDoc(mdxPath, functionInfo, summary);
        }
      } catch (error) {
        summary.errors.push(`Error processing ${functionInfo.name}: ${(error as Error).message}`);
      }
    }

    console.log('\nUpdate Summary:');
    console.log(`Added: ${summary.added.length} functions`);
    console.log(`Updated: ${summary.updated.length} functions`);
    console.log(`Unchanged: ${summary.unchanged.length} functions`);
    if (summary.errors.length > 0) {
      console.log('\nErrors encountered:');
      summary.errors.forEach(error => console.log(`- ${error}`));
    }
  })().catch(error => {
    console.error('Error during documentation update:', error);
    process.exit(1);
  });
}

export {
  updateExistingDoc,
  createNewDoc,
  parseExistingContent,
  extractCodeSection
};