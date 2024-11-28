import fs from 'fs-extra';
import path from 'path';
import { FunctionData } from './types';
import { getParserForFile } from './parsers';

const skipDirs = [
  'node_modules', '.git', 'dist', 'build', 'coverage',
  'logs', 'tmp', 'temp', '.vscode', '.idea'
];

const skipFilePatterns = [
  /(\.spec\.|\.test\.)\./i
];

async function scanDir(dir: string, functions: Set<FunctionData>): Promise<void> {
  const files = await fs.readdir(dir);

  await Promise.all(files.map(async (file) => {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (skipDirs.includes(file)) return;
      await scanDir(fullPath, functions);
    } else {
      if (skipFilePatterns.some(pattern => pattern.test(file))) return;
      await scanFile(fullPath, functions);
    }
  }));
}

async function scanFile(filePath: string, functions: Set<FunctionData>): Promise<void> {
  const parser = getParserForFile(filePath);
  if (!parser) return;

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const result = await parser.parseFile(filePath, content);

    if (result.errors?.length) {
      console.warn(`Warnings while parsing ${filePath}:`, result.errors);
    }

    result.functions.forEach(func => functions.add(func));
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

export async function getFunctionData(baseDir: string): Promise<FunctionData[]> {
  const functions = new Set<FunctionData>();
  await scanDir(baseDir, functions);
  return Array.from(functions);
}

export { FunctionData };