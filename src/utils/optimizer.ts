import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import zlib from 'zlib';

interface FileCache {
  hash: string;
  data: any;
  timestamp: number;
}

interface CacheMetadata {
  [filePath: string]: {
    hash: string;
    lastProcessed: number;
  };
}

export class FileProcessor {
  private cacheDir: string;
  private cacheMetadata: CacheMetadata = {};
  private readonly maxWorkers = cpus().length;
  private supportedExtensions: Set<string>;
  private ignoredPaths: Set<string>;

  constructor(cacheDir: string) {
    this.cacheDir = path.join(cacheDir, '.codex-cache');
    this.supportedExtensions = new Set(['.ts', '.js', '.py', '.php', '.cpp', '.java']);
    this.ignoredPaths = new Set([
      'node_modules',
      'dist',
      'build',
      '.next',
      'webpack',
      'coverage',
      'test',
      '__tests__',
      '.git',
      'public',
      'vendor',
      '__pycache__'
    ]);

    fs.ensureDirSync(this.cacheDir);
    this.loadCacheMetadata();
  }

  private loadCacheMetadata() {
    const metadataPath = path.join(this.cacheDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      this.cacheMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }
  }

  private saveCacheMetadata() {
    const metadataPath = path.join(this.cacheDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(this.cacheMetadata, null, 2));
  }

  private calculateFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private shouldProcessFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    const pathParts = relativePath.split(path.sep);


    if (pathParts.some(part => this.ignoredPaths.has(part))) {
      return false;
    }

    // isfile supported?
    if (!this.supportedExtensions.has(ext)) {
      return false;
    }

    // is it a test file
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return false;
    }

    return true;
  }

  private async processBatch<T>(
    files: string[],
    processor: (file: string) => Promise<T>,
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }
    return results;
  }

  private createWorker(filePath: string, content: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./dist/workers/fileProcessor.js', {
        workerData: {
          filePath,
          content
        }
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  // Update processDirectory method to read file content before creating worker
  async processDirectory(dir: string, processor: (file: string) => Promise<any>): Promise<any[]> {
    const files = await this.getProjectFiles(dir);
    const workerCount = Math.min(this.maxWorkers, files.length);
    const results: any[] = [];

    if (files.length === 0) {
      console.log('No valid source files found to process.');
      return results;
    }

    const filesPerWorker = Math.ceil(files.length / workerCount);
    const workerPromises = [];

    for (let i = 0; i < workerCount; i++) {
      const workerFiles = files.slice(i * filesPerWorker, (i + 1) * filesPerWorker);
      if (workerFiles.length > 0) {
        const batchPromises = workerFiles.map(async file => {
          const content = await fs.readFile(file, 'utf-8');
          const cached = await this.getCachedData(file);
          if (cached) return cached;

          return this.createWorker(file, content);
        });
        workerPromises.push(Promise.all(batchPromises));
      }
    }

    const workerResults = await Promise.all(workerPromises);
    return workerResults.flat();
  }

  async getProjectFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    const traverse = async (currentDir: string) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!this.ignoredPaths.has(entry.name)) {
            await traverse(fullPath);
          }
        } else if (this.shouldProcessFile(fullPath)) {
          files.push(fullPath);
        }
      }
    };

    await traverse(dir);
    return files;
  }

  async getCachedData(filePath: string): Promise<any | null> {
    const cached = this.cacheMetadata[filePath];
    if (!cached) return null;

    const currentHash = this.calculateFileHash(filePath);
    if (currentHash !== cached.hash) return null;

    const cachePath = path.join(this.cacheDir, `${cached.hash}.gz`);
    if (!fs.existsSync(cachePath)) return null;

    try {
      const compressed = await fs.readFile(cachePath);
      const data = await new Promise((resolve, reject) => {
        zlib.gunzip(compressed, (err, result) => {
          if (err) reject(err);
          else resolve(JSON.parse(result.toString()));
        });
      });

      return data;
    } catch (error) {
      console.warn(`Cache read error for ${filePath}:`, error);
      return null;
    }
  }

  async cacheData(filePath: string, data: any): Promise<void> {
    const hash = this.calculateFileHash(filePath);
    this.cacheMetadata[filePath] = {
      hash,
      lastProcessed: Date.now()
    };

    const cachePath = path.join(this.cacheDir, `${hash}.gz`);
    const jsonData = JSON.stringify(data);

    await new Promise((resolve, reject) => {
      zlib.gzip(jsonData, (err, compressed) => {
        if (err) reject(err);
        else fs.writeFile(cachePath, compressed).then(resolve).catch(reject);
      });
    });

    this.saveCacheMetadata();
  }

  async cleanCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const oldEntries = Object.entries(this.cacheMetadata)
      .filter(([, meta]) => now - meta.lastProcessed > maxAge)
      .map(([filePath]) => filePath);

    for (const filePath of oldEntries) {
      const cachePath = path.join(this.cacheDir, `${this.cacheMetadata[filePath].hash}.gz`);
      if (fs.existsSync(cachePath)) {
        await fs.unlink(cachePath);
      }
      delete this.cacheMetadata[filePath];
    }

    this.saveCacheMetadata();
  }
}

// singleton instance
let fileProcessor: FileProcessor | null = null;

export function getFileProcessor(): FileProcessor {
  if (!fileProcessor) {
    fileProcessor = new FileProcessor(process.cwd());
  }
  return fileProcessor;
}