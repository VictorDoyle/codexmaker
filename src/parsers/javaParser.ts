import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import path from 'path';
import { LanguageParser } from '../interfaces/LanguageParser';
import { FunctionData, ParserResult } from '../types';


/* FIXME: Need to review how to more efficiently parse java shards in projects */
export class JavaParser implements LanguageParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Java);
  }

  canParse(filePath: string): boolean {
    return this.getFileExtensions().includes(path.extname(filePath).toLowerCase());
  }

  getLanguageId(): string {
    return 'java';
  }

  getFileExtensions(): string[] {
    return ['.java'];
  }

  private extractJavaDoc(node: Parser.SyntaxNode): string | undefined {
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

  private extractParameters(node: Parser.SyntaxNode): Array<{ name: string; type: string; description?: string }> {
    const parameters: Array<{ name: string; type: string; description?: string }> = [];

    const parameterList = node.children.find(n => n.type === 'formal_parameters');
    if (!parameterList) return parameters;

    for (const param of parameterList.children) {
      if (param.type === 'formal_parameter') {
        const typeNode = param.children.find(n =>
          n.type === 'type_identifier' || n.type === 'primitive_type'
        );
        const nameNode = param.children.find(n => n.type === 'identifier');

        if (nameNode) {
          parameters.push({
            name: nameNode.text,
            type: typeNode?.text || 'Object',
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

  private visitNode(node: Parser.SyntaxNode, content: string): FunctionData | null {
    if (node.type === 'method_declaration') {
      const nameNode = node.children.find(n => n.type === 'identifier');

      if (nameNode) {
        return {
          name: nameNode.text,
          code: content.slice(node.startIndex, node.endIndex),
          codeLang: this.getLanguageId(),
          filePath: '',
          description: this.extractJavaDoc(node),
          parameters: this.extractParameters(node),
          returnType: this.extractReturnType(node)
        };
      }
    }
    return null;
  }

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
}

export default JavaParser;