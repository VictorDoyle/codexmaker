import ts from 'typescript';
import { BaseParser } from './baseParser';
import { FunctionData, ParserResult } from '../types';

export class TypeScriptParser extends BaseParser {
  constructor() {
    super(null); // TypeScript uses its own parser
  }

  getLanguageId(): string {
    return 'typescript';
  }

  getFileExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx'];
  }

  private extractJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
    const comments = ts.getLeadingCommentRanges(sourceFile.getFullText(), node.pos);

    if (comments) {
      for (const comment of comments) {
        const commentText = sourceFile.getFullText().slice(comment.pos, comment.end);
        if (commentText.trim().startsWith('/**') && commentText.trim().endsWith('*/')) {
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

  private extractParameters(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): Array<{ name: string; type: string; description?: string }> {
    return node.parameters.map(param => ({
      name: param.name.getText(sourceFile),
      type: param.type ? param.type.getText(sourceFile) : 'any',
      description: undefined
    }));
  }

  private extractReturnType(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): string {
    if (node.type) {
      return node.type.getText(sourceFile);
    }
    return 'any';
  }

  async parseFile(filePath: string, content: string): Promise<ParserResult> {
    const functions: FunctionData[] = [];
    const errors: string[] = [];

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
          functions.push({
            name: node.name.getText(sourceFile),
            code: node.getText(sourceFile),
            codeLang: this.getLanguageId(),
            filePath,
            description: this.extractJSDocComment(node, sourceFile),
            parameters: this.extractParameters(node, sourceFile),
            returnType: this.extractReturnType(node, sourceFile)
          });
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } catch (error) {
      errors.push(`Error parsing ${filePath}: ${(error as Error).message}`);
    }

    return { functions, errors };
  }

  // override base class method since TS has its own
  protected visitNode(): FunctionData | null {
    return null;
  }
}

export default TypeScriptParser;