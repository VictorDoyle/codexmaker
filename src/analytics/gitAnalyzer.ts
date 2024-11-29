import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import ts from 'typescript';

interface FunctionChange {
  name: string;
  filePath: string;
  changeCount: number;
  lastModified: Date;
  dependsOn: Set<string>;
  dependedOnBy: Set<string>;
  coChangedWith: Map<string, {
    count: number,
    commits: Array<{ hash: string, date: Date, message: string }>
  }>;
}

interface Dependencies {
  calls: string[];
  calledBy: string[];
}

interface CoChange {
  name: string;
  count: number;
  commits: Array<{ hash: string, date: Date, message: string }>;
}

interface ImpactfulFunction {
  name: string;
  dependencyCount: number;
  changeCount: number;
  lastModified: Date;
  dependencies: Dependencies;
  coChanges: CoChange[];
}

interface AnalyticsResult {
  frequentlyChanged: FunctionChange[];
  impactfulFunctions: ImpactfulFunction[];
  totalFunctions: number;
}

export class GitAnalyzer {
  private repoPath: string;
  private functionChanges: Map<string, FunctionChange> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  async analyze(): Promise<AnalyticsResult> {
    await this.buildDependencyGraph();
    await this.analyzeFunctionChanges();
    return this.generateAnalytics();
  }

  private async buildDependencyGraph() {
    const files = execSync('git ls-files "*.ts" "*.js"', { cwd: this.repoPath })
      .toString()
      .split('\n')
      .filter(Boolean);

    // collect all function declarations
    const allFunctions = new Set<string>();
    for (const file of files) {
      const content = await fs.readFile(path.join(this.repoPath, file), 'utf-8');
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      this.collectFunctionDeclarations(sourceFile, allFunctions);
    }

    // analyze dependencies
    for (const file of files) {
      const content = await fs.readFile(path.join(this.repoPath, file), 'utf-8');
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      this.analyzeDependencies(sourceFile, allFunctions);
    }
  }

  private collectFunctionDeclarations(sourceFile: ts.SourceFile, allFunctions: Set<string>) {
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        allFunctions.add(node.name.getText(sourceFile));
      }
      if (ts.isVariableDeclaration(node) &&
        ts.isFunctionExpression(node.initializer || {} as any)) {
        if (ts.isIdentifier(node.name)) {
          allFunctions.add(node.name.getText(sourceFile));
        }
      }
      node.forEachChild(visit);
    };
    visit(sourceFile);
  }

  private analyzeDependencies(sourceFile: ts.SourceFile, allFunctions: Set<string>) {
    let currentFunction: string | null = null;

    const visit = (node: ts.Node) => {
      // look at function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        currentFunction = node.name.getText(sourceFile);
        if (!this.dependencyGraph.has(currentFunction)) {
          this.dependencyGraph.set(currentFunction, new Set());
        }

        // analyze function body for dependencies
        if (node.body) {
          this.analyzeFunctionBody(node.body, currentFunction, sourceFile, allFunctions);
        }
      }

      // look at variable declarations that are functions
      if (ts.isVariableDeclaration(node) &&
        ts.isFunctionExpression(node.initializer || {} as any)) {
        if (ts.isIdentifier(node.name)) {
          currentFunction = node.name.getText(sourceFile);
          if (!this.dependencyGraph.has(currentFunction)) {
            this.dependencyGraph.set(currentFunction, new Set());
          }

          // anlyze function body
          const initializer = node.initializer as ts.FunctionExpression;
          if (initializer.body) {
            this.analyzeFunctionBody(initializer.body, currentFunction, sourceFile, allFunctions);
          }
        }
      }

      node.forEachChild(visit);
    };

    visit(sourceFile);
  }

  private analyzeFunctionBody(
    body: ts.Node,
    currentFunction: string,
    sourceFile: ts.SourceFile,
    allFunctions: Set<string>
  ) {
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        let calledFunctionName: string | undefined;

        // direct function calls
        if (ts.isIdentifier(node.expression)) {
          calledFunctionName = node.expression.getText(sourceFile);
        }
        // method calls on objects
        else if (ts.isPropertyAccessExpression(node.expression)) {
          calledFunctionName = node.expression.name.getText(sourceFile);
        }

        if (calledFunctionName && allFunctions.has(calledFunctionName)) {
          this.dependencyGraph.get(currentFunction)?.add(calledFunctionName);

          // init or update dependedOnBy relationships
          if (!this.dependencyGraph.has(calledFunctionName)) {
            this.dependencyGraph.set(calledFunctionName, new Set());
          }
        }
      }

      node.forEachChild(visit);
    };

    visit(body);
  }

  private async analyzeFunctionChanges() {
    const gitLog = execSync(
      'git log --name-status --pretty=format:"%H|||%at|||%s"',
      { cwd: this.repoPath }
    ).toString();

    const commits = gitLog.split('\n\n').map(commit => {
      const [header, ...files] = commit.split('\n');
      const [hash, timestamp, message] = header.split('|||');
      return {
        hash,
        date: new Date(parseInt(timestamp) * 1000),
        message,
        files: files.map(f => f.split('\t')[1]).filter(Boolean)
      };
    });

    for (const commit of commits) {
      const changedFunctions = new Set<string>();

      for (const file of commit.files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            const content = execSync(
              `git show ${commit.hash}:${file}`,
              { cwd: this.repoPath }
            ).toString();

            const sourceFile = ts.createSourceFile(
              file,
              content,
              ts.ScriptTarget.Latest,
              true
            );

            this.findChangedFunctions(sourceFile, changedFunctions);
          } catch (error) {
            // File might not exist in this commit
            continue;
          }
        }
      }

      changedFunctions.forEach(funcName => {
        if (!this.functionChanges.has(funcName)) {
          this.functionChanges.set(funcName, {
            name: funcName,
            filePath: commit.files[0],
            changeCount: 0,
            lastModified: commit.date,
            dependsOn: this.dependencyGraph.get(funcName) || new Set(),
            dependedOnBy: new Set(),
            coChangedWith: new Map()
          });
        }

        const change = this.functionChanges.get(funcName)!;
        change.changeCount++;
        change.lastModified = commit.date;

        changedFunctions.forEach(otherFunc => {
          if (otherFunc !== funcName) {
            if (!change.coChangedWith.has(otherFunc)) {
              change.coChangedWith.set(otherFunc, {
                count: 0,
                commits: []
              });
            }
            const coChange = change.coChangedWith.get(otherFunc)!;
            coChange.count++;
            coChange.commits.push({
              hash: commit.hash,
              date: commit.date,
              message: commit.message
            });
          }
        });
      });
    }
  }

  private findChangedFunctions(sourceFile: ts.SourceFile, functions: Set<string>) {
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.add(node.name.getText(sourceFile));
      }
      node.forEachChild(visit);
    };

    visit(sourceFile);
  }

  private generateAnalytics(): AnalyticsResult {
    const reverseDependencies = new Map<string, Set<string>>();
    this.dependencyGraph.forEach((deps, func) => {
      deps.forEach(dep => {
        if (!reverseDependencies.has(dep)) {
          reverseDependencies.set(dep, new Set());
        }
        reverseDependencies.get(dep)!.add(func);
      });
    });

    const impactfulFunctions = Array.from(this.functionChanges.values())
      .map(func => {
        const dependenciesCount = (this.dependencyGraph.get(func.name)?.size || 0);
        const dependedOnByCount = (reverseDependencies.get(func.name)?.size || 0);

        return {
          name: func.name,
          dependencyCount: dependenciesCount + dependedOnByCount,
          changeCount: func.changeCount,
          lastModified: func.lastModified,
          dependencies: {
            calls: Array.from(this.dependencyGraph.get(func.name) || []),
            calledBy: Array.from(reverseDependencies.get(func.name) || [])
          },
          coChanges: Array.from(func.coChangedWith.entries())
            .map(([name, data]) => ({
              name,
              count: data.count,
              commits: data.commits
            }))
            .sort((a, b) => b.count - a.count)
        };
      })
      .sort((a, b) => b.dependencyCount - a.dependencyCount);

    return {
      frequentlyChanged: Array.from(this.functionChanges.values())
        .sort((a, b) => b.changeCount - a.changeCount)
        .slice(0, 10),
      impactfulFunctions,
      totalFunctions: this.functionChanges.size
    };
  }
}