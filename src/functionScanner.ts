import fs from 'fs-extra';
import path from 'path';
import { shouldProcessFile } from './utils/fileFilter';
import { availableParsers } from './parsers';
import { FunctionData, ParserResult } from './types';

async function scanDirectory(baseDir: string): Promise<Set<FunctionData>> {
  const functions = new Set<FunctionData>();

  async function traverse(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await traverse(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        if (!shouldProcessFile(fullPath, content)) continue;

        const parser = availableParsers.find(p => p.canParse(fullPath));
        if (!parser) continue;

        const result = await parser.parseFile(fullPath, content);
        result.functions.forEach(func => functions.add(func));
      } catch (error) {
        console.warn(`Error scanning file ${fullPath}:`, error);
      }
    }
  }

  await traverse(baseDir);
  return functions;
}

async function getFunctionData(baseDir: string): Promise<FunctionData[]> {
  const functions = await scanDirectory(baseDir);
  return Array.from(functions).sort((a, b) => a.name.localeCompare(b.name));
}

export { getFunctionData };