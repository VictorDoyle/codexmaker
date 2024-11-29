import fs from 'fs-extra';
import path from 'path';
import { AnalyticsData, DependencyLink } from '../analytics/types';

export class AnalyticsGenerator {
  private outputDir: string;
  private data: AnalyticsData;

  constructor(outputDir: string, data: AnalyticsData) {
    this.outputDir = outputDir;
    this.data = data;
  }

  public async generate(): Promise<void> {
    const analyticsDir = path.join(this.outputDir, 'pages', 'analytics');
    await fs.ensureDir(analyticsDir);

    // make subdir
    const hotspotsDir = path.join(analyticsDir, 'hotspots');
    const dependenciesDir = path.join(analyticsDir, 'dependencies');
    const timelineDir = path.join(analyticsDir, 'timeline');

    await fs.ensureDir(hotspotsDir);
    await fs.ensureDir(dependenciesDir);
    await fs.ensureDir(timelineDir);

    await this.generateIndexPage(analyticsDir);
    await this.generateHotspotsPages(hotspotsDir);
    await this.generateDependenciesPages(dependenciesDir);
    await this.generateTimelinePages(timelineDir);
  }

  private async generateIndexPage(dir: string): Promise<void> {
    const content = `# Code Analytics

## Overview
This section provides insights into your codebase's evolution and dependencies.

### Quick Stats
- Total Functions Analyzed: ${this.data.functionChanges.size}
- Total Dependencies Found: ${this.data.dependencies.length}
- Timeline Entries: ${this.data.timeline.length}

### Sections
- [Hotspots](/analytics/hotspots) - Most frequently changing functions
- [Dependencies](/analytics/dependencies) - Function change patterns and relationships
- [Timeline](/analytics/timeline) - Chronological view of changes

### Why This Matters
Understanding how your code evolves can help:
- Identify areas that need refactoring
- Discover hidden dependencies
- Plan maintenance and testing strategies
`;
    await fs.writeFile(path.join(dir, 'index.mdx'), content);
  }

  private async generateHotspotsPages(dir: string): Promise<void> {
    const indexContent = `# Code Hotspots

Functions that change most frequently and have the most impact.

## Quick Stats
${this.data.hotspots.slice(0, 5).map((spot, index) => `
### ${index + 1}. ${spot.function}
Score: ${spot.score.toFixed(2)}
`).join('\n')}

[View Detailed Analysis](./hotspots/details)
`;
    await fs.writeFile(path.join(dir, 'index.mdx'), indexContent);

    const detailsContent = `# Detailed Hotspot Analysis

## Top Hotspots by Change Frequency
${this.data.hotspots.map((spot, index) => `
### ${index + 1}. ${spot.function}
- **Score**: ${spot.score.toFixed(2)}
- **Changes**: ${this.data.functionChanges.get(spot.function)?.changeCount || 0}
- **Last Modified**: ${this.data.functionChanges.get(spot.function)?.lastModified.toLocaleDateString()}
- **Co-changes**: ${this.data.functionChanges.get(spot.function)?.coChangedFunctions.size || 0} related functions

#### Recent Commits
${this.data.functionChanges.get(spot.function)?.commits.slice(0, 5).map(commit => `
- ${commit.timestamp.toLocaleDateString()}: ${commit.message} (${commit.hash.substring(0, 7)})
`).join('') || 'No recent commits'}
`).join('\n')}
`;
    await fs.writeFile(path.join(dir, 'details.mdx'), detailsContent);
  }

  private async generateDependenciesPages(dir: string): Promise<void> {
    const indexContent = `# Function Dependencies

Analysis of functions that frequently change together.

## Top Dependencies
${this.data.dependencies.slice(0, 5).map((dep, index) => `
### ${index + 1}. ${dep.source} → ${dep.target}
- Changes Together: ${dep.changeCount} times
- Confidence: ${(dep.confidence * 100).toFixed(1)}%
`).join('\n')}

[View All Dependencies](./dependencies/details)
`;
    await fs.writeFile(path.join(dir, 'index.mdx'), indexContent);

    const detailsContent = `# Detailed Dependencies Analysis

## All Function Dependencies
${this.data.dependencies.map((dep, index) => `
### ${index + 1}. ${dep.source} → ${dep.target}
- **Change Together**: ${dep.changeCount} times
- **Confidence**: ${(dep.confidence * 100).toFixed(1)}%
- **Source Changes**: ${this.data.functionChanges.get(dep.source)?.changeCount || 0} total
- **Target Changes**: ${this.data.functionChanges.get(dep.target)?.changeCount || 0} total

#### Recent Co-Changes
${this.getRecentCoChanges(dep.source, dep.target)}
`).join('\n')}
`;
    await fs.writeFile(path.join(dir, 'details.mdx'), detailsContent);
  }

  private async generateTimelinePages(dir: string): Promise<void> {
    const indexContent = `# Change Timeline

Chronological view of function changes.

## Recent Changes
${this.data.timeline.slice(0, 5).map(entry => `
### ${entry.timestamp.toLocaleDateString()} ${entry.timestamp.toLocaleTimeString()}
- **Commit**: ${entry.commitHash.substring(0, 8)}
- **Message**: ${entry.commitMessage}
- **Functions Changed**: ${entry.functions.length}
`).join('\n')}

[View Full Timeline](./timeline/details)
`;
    await fs.writeFile(path.join(dir, 'index.mdx'), indexContent);

    const detailsContent = `# Complete Change Timeline

${this.data.timeline.map(entry => `
## ${entry.timestamp.toLocaleDateString()} ${entry.timestamp.toLocaleTimeString()}
- **Commit**: ${entry.commitHash.substring(0, 8)}
- **Message**: ${entry.commitMessage}
- **Changed Functions**:
${entry.functions.map(f => `  - ${f}`).join('\n')}
`).join('\n')}
`;
    await fs.writeFile(path.join(dir, 'details.mdx'), detailsContent);
  }

  private getRecentCoChanges(source: string, target: string): string {
    const coChanges = this.data.timeline
      .filter(entry => entry.functions.includes(source) && entry.functions.includes(target))
      .slice(0, 3);

    if (coChanges.length === 0) {
      return 'No recent co-changes found';
    }

    return coChanges.map(entry => `
- ${entry.timestamp.toLocaleDateString()}: ${entry.commitMessage} (${entry.commitHash.substring(0, 7)})
`).join('');
  }
}