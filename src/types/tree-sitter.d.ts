declare module 'tree-sitter' {
  export default class Parser {
    setLanguage(lang: any): void;
    parse(input: string): Parser.Tree;
    static Language: any;
  }

  namespace Parser {
    export interface Tree {
      rootNode: SyntaxNode;
      walk(): TreeCursor;
    }

    export interface TreeCursor {
      currentNode: SyntaxNode;
      startPosition: Point;
      endPosition: Point;
      gotoFirstChild(): boolean;
      gotoNextSibling(): boolean;
      gotoParent(): boolean;
    }

    export interface SyntaxNode {
      type: string;
      startIndex: number;
      endIndex: number;
      text: string;
      children: SyntaxNode[];
      firstChild?: SyntaxNode;
      previousSibling?: SyntaxNode;
      parent?: SyntaxNode;
      hasError(): boolean;
    }

    export interface Point {
      row: number;
      column: number;
    }
  }
}

declare module 'tree-sitter-cpp' {
  const cpp: any;
  export default cpp;
}

declare module 'tree-sitter-python' {
  const python: any;
  export default python;
}

declare module 'tree-sitter-php' {
  const php: any;
  export default php;
}

declare module 'tree-sitter-java' {
  const java: any;
  export default java;
}