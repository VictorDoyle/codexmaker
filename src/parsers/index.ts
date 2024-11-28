import TypeScriptParser from './typescriptParser';
import PythonParser from './pythonParser';
import CppParser from './cppParser';
import PhpParser from './phpParser';
import JavaParser from './javaParser';
import { LanguageParser } from '../interfaces/LanguageParser';

export const availableParsers: LanguageParser[] = [
  new TypeScriptParser(),
  new PythonParser(),
  new CppParser(),
  new PhpParser(),
  new JavaParser()
];

export function getParserForFile(filePath: string): LanguageParser | undefined {
  return availableParsers.find(parser => parser.canParse(filePath));
}

// check supported file extensions
export function getSupportedExtensions(): string[] {
  return Array.from(new Set(
    availableParsers.flatMap(parser => parser.getFileExtensions())
  ));
}

//verify supported langs
export function getSupportedLanguages(): string[] {
  return availableParsers.map(parser => parser.getLanguageId());
}