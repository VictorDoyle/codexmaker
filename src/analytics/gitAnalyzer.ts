import { execSync } from 'child_process';
import path from 'path';
import { FunctionChange, AnalyticsData, DependencyLink, TimelineEntry } from './types';

export class GitAnalyzer {
  private repoPath: string;
  private functionChanges: Map<string, FunctionChange>;
  private functionFiles: Map<string, Set<string>>;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.functionChanges = new Map();
    this.functionFiles = new Map();
  }

  public async analyze(): Promise<AnalyticsData> {
    await this.buildFunctionFileMap();
    await this.processGitHistory();

    return {
      functionChanges: this.functionChanges,
      dependencies: this.calculateDependencies(),
      timeline: this.buildTimeline(),
      hotspots: this.calculateHotspots()
    };
  }

  private async buildFunctionFileMap() {
    const files = execSync('git ls-files', { cwd: this.repoPath })
      .toString()
      .split('\n')
      .filter(f => f);

    // mpa functions to their files
    files.forEach(file => {
      const ext = path.extname(file);
      if (['.ts', '.js', '.py', '.php', '.cpp', '.java'].includes(ext)) {
        const content = execSync(`git show HEAD:${file}`, { cwd: this.repoPath }).toString();
        const functions = this.extractFunctions(content);
        functions.forEach(func => {
          if (!this.functionFiles.has(func)) {
            this.functionFiles.set(func, new Set());
          }
          this.functionFiles.get(func)!.add(file);
        });
      }
    });
  }

  private extractFunctions(content: string): string[] {
    // regex for function detection 
    // TODO: maybe import parsers here
    const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const matches = [...content.matchAll(functionRegex)];
    return matches.map(m => m[1]);
  }

  private async processGitHistory() {
    const gitLog = execSync(
      'git log --pretty=format:"%H|||%at|||%s" --name-only',
      { cwd: this.repoPath }
    ).toString();

    const commits = gitLog.split('\n\n').map(commit => {
      const [header, ...files] = commit.split('\n');
      const [hash, timestamp, message] = header.split('|||');
      return {
        hash,
        timestamp: new Date(parseInt(timestamp) * 1000),
        message,
        files: files.filter(f => f)
      };
    });

    commits.forEach(commit => {
      const affectedFunctions = new Set<string>();

      commit.files.forEach(file => {
        this.functionFiles.forEach((files, funcName) => {
          if (files.has(file)) {
            affectedFunctions.add(funcName);
            this.updateFunctionChange(funcName, commit);
          }
        });
      });

      // update co-changes
      Array.from(affectedFunctions).forEach(func1 => {
        Array.from(affectedFunctions).forEach(func2 => {
          if (func1 !== func2) {
            const change = this.functionChanges.get(func1)!;
            change.coChangedFunctions.set(
              func2,
              (change.coChangedFunctions.get(func2) || 0) + 1
            );
          }
        });
      });
    });
  }

  private updateFunctionChange(functionName: string, commit: { hash: string; timestamp: Date; message: string }) {
    if (!this.functionChanges.has(functionName)) {
      this.functionChanges.set(functionName, {
        name: functionName,
        filePath: Array.from(this.functionFiles.get(functionName) || []).join(', '),
        changeCount: 0,
        lastModified: commit.timestamp,
        commits: [],
        coChangedFunctions: new Map()
      });
    }

    const change = this.functionChanges.get(functionName)!;
    change.changeCount++;
    change.commits.push({
      hash: commit.hash,
      timestamp: commit.timestamp,
      message: commit.message
    });
  }

  private calculateDependencies(): DependencyLink[] {
    const dependencies: DependencyLink[] = [];

    this.functionChanges.forEach((change, funcName) => {
      change.coChangedFunctions.forEach((count, target) => {
        const confidence = count / change.changeCount;
        if (confidence > 0.5) { // only include strong dependencies
          dependencies.push({
            source: funcName,
            target,
            changeCount: count,
            confidence
          });
        }
      });
    });

    return dependencies.sort((a, b) => b.confidence - a.confidence);
  }

  private buildTimeline(): TimelineEntry[] {
    const timeline: TimelineEntry[] = [];
    const processedCommits = new Set<string>();

    this.functionChanges.forEach(change => {
      change.commits.forEach(commit => {
        if (!processedCommits.has(commit.hash)) {
          processedCommits.add(commit.hash);
          timeline.push({
            timestamp: commit.timestamp,
            functions: Array.from(this.functionChanges.entries())
              .filter(([_, fc]) => fc.commits.some(c => c.hash === commit.hash))
              .map(([name]) => name),
            commitHash: commit.hash,
            commitMessage: commit.message
          });
        }
      });
    });

    return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private calculateHotspots(): Array<{ function: string; score: number }> {
    return Array.from(this.functionChanges.entries())
      .map(([name, change]) => ({
        function: name,
        score: change.changeCount *
          (change.coChangedFunctions.size + 1) *
          Math.log(Date.now() - change.lastModified.getTime())
      }))
      .sort((a, b) => b.score - a.score);
  }
}