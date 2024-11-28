import Python from 'tree-sitter-python';
import Parser from 'tree-sitter';
import { BaseParser } from './baseParser';
import { FunctionData } from '../types';

export class PythonParser extends BaseParser {
  constructor() {
    super(Python);
  }

  getLanguageId(): string {
    return 'python';
  }

  getFileExtensions(): string[] {
    return ['.py'];
  }

  private extractDocstring(node: Parser.SyntaxNode): string | undefined {
    const firstChild = node.children.find(child =>
      child.type === 'expression_statement' &&
      child.firstChild?.type === 'string'
    );

    if (firstChild?.firstChild) {
      return firstChild.firstChild.text
        .replace(/^(['"])\1\1/, '')
        .replace(/(['"])\1\1$/, '')
        .trim();
    }
    return undefined;
  }

  private extractParameters(node: Parser.SyntaxNode): Array<{ name: string; type: string; description?: string }> {
    const parameters: Array<{ name: string; type: string; description?: string }> = [];

    const paramsList = node.children.find(n => n.type === 'parameters');
    if (!paramsList) return parameters;

    for (const param of paramsList.children) {
      if (param.type === 'identifier') {
        parameters.push({
          name: param.text,
          type: 'any',
          description: undefined
        });
      } else if (param.type === 'typed_parameter') {
        const nameNode = param.children.find(n => n.type === 'identifier');
        const typeNode = param.children.find(n => n.type === 'type');

        if (nameNode) {
          parameters.push({
            name: nameNode.text,
            type: typeNode?.text || 'any',
            description: undefined
          });
        }
      }
    }

    return parameters;
  }

  protected visitNode(node: Parser.SyntaxNode, content: string): FunctionData | null {
    if (node.type === 'function_definition') {
      const nameNode = node.children.find(n => n.type === 'identifier');

      if (nameNode) {
        return {
          name: nameNode.text,
          code: content.slice(node.startIndex, node.endIndex),
          codeLang: this.getLanguageId(),
          filePath: '',
          description: this.extractDocstring(node),
          parameters: this.extractParameters(node),
          returnType: 'any'
        };
      }
    }
    return null;
  }
}

export default PythonParser;