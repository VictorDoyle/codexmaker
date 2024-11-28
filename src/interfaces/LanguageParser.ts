import { FunctionData, ParserResult } from '../types';

export interface LanguageParser {
  canParse(filePath: string): boolean;
  parseFile(filePath: string, content: string): Promise<ParserResult>;
  getLanguageId(): string;
  getFileExtensions(): string[];
}

export const SupportedLanguages = {
  TYPESCRIPT: 'typescript',
  JAVASCRIPT: 'javascript',
  PYTHON: 'python',
  PHP: 'php',
  CPP: 'cpp',
  JAVA: 'java'
} as const;

export type SupportedLanguage = typeof SupportedLanguages[keyof typeof SupportedLanguages];