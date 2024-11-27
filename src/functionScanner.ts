import fs from 'fs-extra';
import path from 'path';
import ts from 'typescript';

interface FunctionData {
  name: string;
  code: string;
  filePath: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  returnType?: string;
}

/**
 * Extracts JSDoc comments from a node.
 * 
 * @param node The TypeScript AST node
 * @param sourceFile The source file
 * @returns Parsed JSDoc comment or undefined
 */
function extractJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  const comments = ts.getLeadingCommentRanges(sourceFile.getFullText(), node.pos);

  if (comments) {
    for (const comment of comments) {
      const commentText = sourceFile.getFullText().slice(comment.pos, comment.end);

      // verify if JSDoc comment (starts with /** and ends with */)
      if (commentText.trim().startsWith('/**') && commentText.trim().endsWith('*/')) {
        // Remove /** and */ and trim
        return commentText
          .replace(/^\/\*\*/, '')
          .replace(/\*\/$/, '')
          .split('\n')
          .map(line => line.replace(/^\s*\*\s?/, '').trim())
          .filter(line => line && !line.startsWith('@'))
          .join(' ')
          .trim();
      }
    }
  }

  return undefined;
}

/**
 * Extracts parameter information with types and descriptions.
 * 
 * @param node Function declaration node
 * @param sourceFile Source file
 * @returns Array of parameter information
 */
function extractParameters(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): Array<{
  name: string;
  type: string;
  description?: string;
}> {
  return node.parameters.map(param => {
    const name = param.name.getText(sourceFile);
    let type = 'any';

    // Extract type annotation
    if (param.type) {
      type = param.type.getText(sourceFile);
    }

    return {
      name,
      type
    };
  });
}

/**
 * Extracts return type of a function.
 * 
 * @param node Function declaration node
 * @param sourceFile Source file
 * @returns Return type as a string
 */
function extractReturnType(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): string {
  if (node.type) {
    return node.type.getText(sourceFile);
  }
  return 'void';
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
      // extract fx code
      const functionCode = node.getText(sourceFile);

      // create it as data object
      const functionData: FunctionData = {
        name: node.name.getText(sourceFile),
        code: functionCode,
        filePath,
        description: extractJSDocComment(node, sourceFile),
        parameters: extractParameters(node, sourceFile),
        returnType: extractReturnType(node, sourceFile)
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

export { FunctionData };