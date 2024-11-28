import ts from 'typescript';
import path from 'path';
import { LanguageParser } from '../interfaces/LanguageParser';
import { FunctionData, ParserResult } from '../types';

export class TypeScriptParser implements LanguageParser {
  canParse(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.getFileExtensions().includes(ext);
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

  private extractParameters(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): Array<{
    name: string;
    type: string;
    description?: string;
  }> {
    return node.parameters.map(param => {
      const name = param.name.getText(sourceFile);
      let type = 'any';

      if (param.type) {
        type = param.type.getText(sourceFile);
      }

      return {
        name,
        type,
        description: undefined
      };
    });
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

      ts.forEachChild(sourceFile, node => {
        if (ts.isFunctionDeclaration(node) && node.name) {
          const functionData: FunctionData = {
            name: node.name.getText(sourceFile),
            code: node.getText(sourceFile),
            codeLang: this.getLanguageId(),
            filePath,
            description: this.extractJSDocComment(node, sourceFile),
            parameters: this.extractParameters(node, sourceFile),
            returnType: this.extractReturnType(node, sourceFile)
          };
          functions.push(functionData);
        }
      });
    } catch (error) {
      errors.push(`Error parsing ${filePath}: ${(error as Error).message}`);
    }

    return { functions, errors };
  }
}

export default TypeScriptParser;