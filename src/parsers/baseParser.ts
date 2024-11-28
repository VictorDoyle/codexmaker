import Parser from 'tree-sitter';
import path from 'path';
import { LanguageParser } from '../interfaces/LanguageParser';
import { FunctionData, ParserResult } from '../types';

export abstract class BaseParser implements LanguageParser {
  protected parser: Parser;

  constructor(language: any) {
    this.parser = new Parser();
    this.parser.setLanguage(language);
  }

  canParse(filePath: string): boolean {
    return this.getFileExtensions().includes(path.extname(filePath).toLowerCase());
  }

  abstract getLanguageId(): string;
  abstract getFileExtensions(): string[];
  protected abstract visitNode(node: Parser.SyntaxNode, content: string): FunctionData | null;

  async parseFile(filePath: string, content: string): Promise<ParserResult> {
    const functions: FunctionData[] = [];
    const errors: string[] = [];

    try {
      const tree = this.parser.parse(content);
      const visit = (node: Parser.SyntaxNode) => {
        const func = this.visitNode(node, content);
        if (func) {
          func.filePath = filePath;
          functions.push(func);
        }

        for (const child of node.children) {
          visit(child);
        }
      };

      visit(tree.rootNode);
    } catch (error) {
      errors.push(`Error parsing ${filePath}: ${(error as Error).message}`);
    }

    return { functions, errors };
  }

  protected extractCommentBlock(node: Parser.SyntaxNode): string | undefined {
    const previousSibling = node.previousSibling;
    if (previousSibling && previousSibling.type === 'comment') {
      return previousSibling.text
        .replace(/^\/\*\*/, '')
        .replace(/\*\/$/, '')
        .split('\n')
        .map((line: string) => line.trim().replace(/^\* ?/, ''))
        .filter((line: string) => line && !line.startsWith('@'))
        .join(' ');
    }
    return undefined;
  }
}