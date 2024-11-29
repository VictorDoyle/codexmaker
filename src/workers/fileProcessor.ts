import { parentPort, workerData } from 'worker_threads';
import { availableParsers } from '../parsers';

async function processWorkerFile() {
  if (!parentPort) throw new Error('This file must be run as a worker');

  try {
    const { filePath, content } = workerData;

    // find correct parser
    const parser = availableParsers.find(p => p.canParse(filePath));
    if (!parser) {
      parentPort.postMessage({
        functions: [],
        errors: [`No parser available for file: ${filePath}`]
      });
      return;
    }

    // parse file
    const result = await parser.parseFile(filePath, content);
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      functions: [],
      errors: [`Worker error processing ${workerData.filePath}: ${(error as Error).message}`]
    });
  }
}

processWorkerFile().catch(error => {
  console.error('Worker error:', error);
  process.exit(1);
});