export interface FunctionData {
  name: string;
  code: string;
  codeLang: string;
  filePath: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  returnType?: string;
}

export interface ParserResult {
  functions: FunctionData[];
  errors?: string[];
}