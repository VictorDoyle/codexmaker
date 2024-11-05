import fs from 'fs-extra';
import path from 'path';
import ts from 'typescript';

interface FunctionData {
  name: string;
  params: string[];
  filePath: string;
}

/**
 * Recursively scans a directory for TypeScript files and collects function declarations.
 * 
 * @param dir The directory to scan.
 * @param functions A Set to track unique functions found.
 */
async function scanDirectory(dir: string, functions: Set<FunctionData>): Promise<void> {
  const files = await fs.readdir(dir);

  // skip patterned dirs which dont need to be documented
  const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', 'logs', 'tmp', 'temp', '.vscode', '.idea'];
  const skipFilePatterns = [/\.js$/, /\.jsx$/, /\.d\.ts$/, /\.spec\.ts$/, /\.test\.ts$/];

  await Promise.all(files.map(async (file) => {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (skipDirs.includes(file)) return;
      // TODO: modify using O
      await scanDirectory(fullPath, functions);
    } else {
      if (skipFilePatterns.some(pattern => pattern.test(file))) return;

      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        await scanFile(fullPath, functions);
      }
    }
  }));
}


/**
 * Parses a TypeScript file and extracts function declarations.
 * 
 * @param filePath The path to the TypeScript file.
 * @param functions A Set to track unique functions found.
 */
async function scanFile(filePath: string, functions: Set<FunctionData>): Promise<void> {
  const content = await fs.readFile(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // walkthru AST and find the function declarations
  ts.forEachChild(sourceFile, node => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const params = node.parameters.map(p => p.name.getText(sourceFile));
      const functionData: FunctionData = {
        name: node.name.getText(sourceFile),
        params,
        filePath,
      };
      functions.add(functionData);
    }
  });
}

/**
 * Main function to scan the codebase and return unique function data.
 * 
 * @param baseDir The base directory to start scanning.
 * @returns An array of unique functions found in the codebase.
 */
export async function getFunctionData(baseDir: string): Promise<FunctionData[]> {
  const functions = new Set<FunctionData>();
  await scanDirectory(baseDir, functions);
  return Array.from(functions);
}
