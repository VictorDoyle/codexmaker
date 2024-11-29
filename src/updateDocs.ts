import fs from 'fs-extra';
import path from 'path';
import { GitAnalyzer } from './analytics/gitAnalyzer';
import { AnalyticsGenerator } from './generators/analyticsGenerator';

interface UpdateSummary {
  added: string[];
  updated: string[];
  unchanged: string[];
  errors: string[];
}

export async function updateDocs(functionData: any[], outputDir: string): Promise<void> {
  const summary: UpdateSummary = {
    added: [],
    updated: [],
    unchanged: [],
    errors: []
  };

  const pagesDir = path.join(outputDir, 'pages');
  const functionsDir = path.join(pagesDir, 'functions');

  await fs.ensureDir(functionsDir);

  for (const functionInfo of functionData) {
    const { name, code, codeLang, description, parameters, returnType } = functionInfo;
    const mdxPath = path.join(functionsDir, `${name}.mdx`);

    try {
      if (await fs.pathExists(mdxPath)) {
        await updateExistingDoc(mdxPath, functionInfo, summary);
      } else {
        await createNewDoc(mdxPath, functionInfo, summary);
      }
    } catch (error) {
      summary.errors.push(`Error processing ${name}: ${(error as Error).message}`);
    }
  }

  console.log('Updating analytics...');
  const gitAnalyzer = new GitAnalyzer(process.cwd());
  const analyticsData = await gitAnalyzer.analyze();
  const analyticsGenerator = new AnalyticsGenerator(outputDir, analyticsData);
  await analyticsGenerator.generate();

  console.log('\nUpdate Summary:');
  console.log(`Added: ${summary.added.length} functions`);
  console.log(`Updated: ${summary.updated.length} functions`);
  console.log(`Unchanged: ${summary.unchanged.length} functions`);
  if (summary.errors.length > 0) {
    console.log('\nErrors encountered:');
    summary.errors.forEach(error => console.log(`- ${error}`));
  }
}

async function updateExistingDoc(mdxPath: string, functionInfo: any, summary: UpdateSummary) {
  const existingContent = await fs.readFile(mdxPath, 'utf-8');
  const { name, code, codeLang, description, parameters, returnType } = functionInfo;

  // parse pre existing content to preserve custom sections/docs
  const sections = parseExistingContent(existingContent);
  const currentCodeSection = extractCodeSection(existingContent);

  if (currentCodeSection === code) {
    summary.unchanged.push(name);
    return;
  }

  // update automatically generated sections while preserving custom content
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

    // collect any custom sections
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