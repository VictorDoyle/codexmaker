import PHP from 'tree-sitter-php';
import Parser from 'tree-sitter';
import { BaseParser } from './baseParser';
import { FunctionData } from '../types';

export class PhpParser extends BaseParser {
  constructor() {
    super(PHP);
  }

  getLanguageId(): string {
    return 'php';
  }

  getFileExtensions(): string[] {
    return ['.php'];
  }

  private extractParameters(node: Parser.SyntaxNode): Array<{ name: string; type: string; description?: string }> {
    const parameters: Array<{ name: string; type: string; description?: string }> = [];

    const parameterList = node.children.find(n => n.type === 'formal_parameters');
    if (!parameterList) return parameters;

    for (const param of parameterList.children) {
      if (param.type === 'simple_parameter') {
        const typeNode = param.children.find(n => n.type === 'type_identifier');
        const nameNode = param.children.find(n => n.type === 'variable_name');

        if (nameNode) {
          parameters.push({
            name: nameNode.text.replace('$', ''),
            type: typeNode?.text || 'mixed',
            description: undefined
          });
        }
      }
    }

    return parameters;
  }

  protected visitNode(node: Parser.SyntaxNode, content: string): FunctionData | null {
    if (node.type === 'function_definition') {
      const nameNode = node.children.find(n => n.type === 'name');

      if (nameNode) {
        return {
          name: nameNode.text,
          code: content.slice(node.startIndex, node.endIndex),
          codeLang: this.getLanguageId(),
          filePath: '',
          description: this.extractCommentBlock(node),
          parameters: this.extractParameters(node),
          returnType: 'mixed'
        };
      }
    }
    return null;
  }
}

export default PhpParser;