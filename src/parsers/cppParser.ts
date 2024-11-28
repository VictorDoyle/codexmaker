import Cpp from 'tree-sitter-cpp';
import Parser from 'tree-sitter';
import { BaseParser } from './baseParser';
import { FunctionData } from '../types';

export class CppParser extends BaseParser {
  constructor() {
    super(Cpp);
  }

  getLanguageId(): string {
    return 'cpp';
  }

  getFileExtensions(): string[] {
    return ['.cpp', '.hpp', '.h', '.cc', '.cxx'];
  }

  private extractParameters(node: Parser.SyntaxNode): Array<{ name: string; type: string; description?: string }> {
    const parameters: Array<{ name: string; type: string; description?: string }> = [];

    const parameterList = node.children.find(n => n.type === 'parameter_list');
    if (!parameterList) return parameters;

    for (const param of parameterList.children) {
      if (param.type === 'parameter_declaration') {
        const typeNode = param.children.find(n => n.type === 'type_identifier');
        const nameNode = param.children.find(n => n.type === 'identifier');

        if (nameNode) {
          parameters.push({
            name: nameNode.text,
            type: typeNode?.text || 'void',
            description: undefined
          });
        }
      }
    }

    return parameters;
  }

  private extractReturnType(node: Parser.SyntaxNode): string {
    const returnType = node.children.find(n =>
      n.type === 'primitive_type' || n.type === 'type_identifier'
    );
    return returnType ? returnType.text : 'void';
  }

  protected visitNode(node: Parser.SyntaxNode, content: string): FunctionData | null {
    if (node.type === 'function_definition') {
      const declarator = node.children.find(n => n.type === 'function_declarator');
      const nameNode = declarator?.children.find(n => n.type === 'identifier');

      if (nameNode) {
        return {
          name: nameNode.text,
          code: content.slice(node.startIndex, node.endIndex),
          codeLang: this.getLanguageId(),
          filePath: '',
          description: this.extractCommentBlock(node),
          parameters: this.extractParameters(node),
          returnType: this.extractReturnType(node)
        };
      }
    }
    return null;
  }
}

export default CppParser;