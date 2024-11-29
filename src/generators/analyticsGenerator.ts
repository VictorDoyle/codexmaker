import fs from 'fs-extra';
import path from 'path';

export class AnalyticsGenerator {
  private outputDir: string;
  private data: any;

  constructor(outputDir: string, data: any) {
    this.outputDir = outputDir;
    this.data = data;
  }

  async generate(): Promise<void> {
    const analyticsDir = path.join(this.outputDir, 'pages', 'analytics');
    await fs.ensureDir(analyticsDir);

    const indexContent = `# Code Change Analysis

## Overview
Analyzing ${this.data.totalFunctions} functions in your codebase.

## Key Findings
- Most frequently changed functions
- Function dependencies and impacts
- Change patterns and relationships

## Navigation
- [Change Frequency](./change-frequency) - Most frequently modified functions
- [Dependencies](./dependencies) - Function relationships and impacts
- [Change Patterns](./change-patterns) - How functions change together
`;
    await fs.writeFile(path.join(analyticsDir, 'index.mdx'), indexContent);

    const frequencyContent = `# Change Frequency Analysis

This page shows which functions are modified most frequently.

${this.data.frequentlyChanged.map((func: any, index: number) => `
## ${index + 1}. ${func.name}
- Changed ${func.changeCount} times
- Last modified: ${func.lastModified.toLocaleDateString()}
- File: ${func.filePath}
`).join('\n')}
`;
    await fs.writeFile(path.join(analyticsDir, 'change-frequency.mdx'), frequencyContent);


    const dependenciesContent = `# Function Dependencies

This shows how functions are connected and their impact on the codebase.

${this.data.impactfulFunctions.map((func: any) => `
## ${func.name}
### Impact Score: ${func.dependencyCount} (${func.changeCount} changes)

#### Dependencies
- **Calls**: ${func.dependencies.calls.length > 0 ?
        func.dependencies.calls.map((f: string) => `\`${f}\``).join(', ') :
        'No dependencies'}
- **Called By**: ${func.dependencies.calledBy.length > 0 ?
        func.dependencies.calledBy.map((f: string) => `\`${f}\``).join(', ') :
        'Not called by other functions'}

#### Change Impact
When this function changes, these functions often need updates:
${func.coChanges.slice(0, 5).map((co: any) => `
- \`${co.name}\` (${co.count} times)
  - Last change: ${co.commits[0]?.date.toLocaleDateString() || 'N/A'}
  - Reason: ${co.commits[0]?.message || 'N/A'}
`).join('')}
`).join('\n')}
`;
    await fs.writeFile(path.join(analyticsDir, 'dependencies.mdx'), dependenciesContent);

    const patternsContent = `# Change Patterns

Understanding how functions change together.

${this.data.impactfulFunctions.slice(0, 10).map((func: any) => `
## ${func.name} Change Pattern
- Total Changes: ${func.changeCount}
- Dependencies: ${func.dependencyCount}

### Common Co-changes
${func.coChanges.slice(0, 5).map((co: any) => `
#### With \`${co.name}\`
- Changed together ${co.count} times
- Recent changes:
${co.commits.slice(0, 3).map((commit: any) => `  - ${commit.date.toLocaleDateString()}: ${commit.message}`).join('\n')}
`).join('\n')}
`).join('\n')}
`;
    await fs.writeFile(path.join(analyticsDir, 'change-patterns.mdx'), patternsContent);
  }
}