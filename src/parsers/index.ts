import TypeScriptParser from './typescriptParser';

export const availableParsers = [
  new TypeScriptParser()
];

export function getParserForFile(filePath: string) {
  return availableParsers.find(parser => parser.canParse(filePath));
}