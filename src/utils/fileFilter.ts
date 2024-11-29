export const IGNORED_DIRECTORIES = new Set([
  // Build and output directories
  'dist',
  'build',
  '.next',
  'out',
  'public',
  'coverage',

  // Package directories
  'node_modules',
  'vendor',
  'packages',

  // Test directories
  'test',
  'tests',
  '__tests__',
  '__mocks__',

  // Cache directories
  '.cache',
  '__pycache__',

  // Version control
  '.git',
  '.svn',

  // IDE directories
  '.idea',
  '.vscode',

  // Generated directories
  'generated',
  '.generated',
  'gen',

  // Webpack related
  '.webpack',
  'webpack',
  'webpack.config',
]);

export const IGNORED_FILE_PATTERNS = [
  // Test files
  /\.(test|spec|e2e|stories)\.[jt]sx?$/,

  // Configuration files
  /\.(config|conf)\.[jt]s$/,

  // Generated/compiled files
  /\.(min|bundle|chunk|compiled)\.[jt]sx?$/,
  /\.d\.ts$/,

  // Webpack related
  /webpack.*\.[jt]s$/,
  /\.webpack\./,

  // Polyfills and shims
  /polyfill.*\.[jt]sx?$/,
  /shim.*\.[jt]sx?$/,

  // Build artifacts
  /\.build\./,
  /\.dist\./,

  // Generated source maps
  /\.map$/,

  // Minified files
  /\.min\./,

  // Generated types
  /\.types\.[jt]s$/,
  /types\.generated/,

  // Environment files
  /\.env/,

  // Documentation
  /\.md$/,
  /\.mdx$/,

  // Common generated file patterns
  /_generated/,
  /generated\//,
  /\.g\.[jt]sx?$/
];

export const IGNORED_FILE_CONTENTS = [
  // Common webpack/bundler patterns
  /__webpack_require__/,
  /webpack:\/\//,
  /webpackJsonp/,

  // Minified code indicators
  /^[!function\(][^]{200,}[;\)}]$/m,

  // Source map references
  /\/\/# sourceMappingURL/,

  // Common bundler artifacts
  /module\.exports =/,
  /exports\.__esModule/,
  /Object\.defineProperty\(exports,/,

  // Generated code markers
  /@generated/i,
  /DO NOT EDIT/i,
  /Auto-generated/i,

  // Polyfill indicators
  /polyfill/i,
  /shim for/i
];

export function shouldProcessFile(filePath: string, content?: string): boolean {
  const pathParts = filePath.split('/');
  if (pathParts.some(part => IGNORED_DIRECTORIES.has(part))) {
    return false;
  }

  if (IGNORED_FILE_PATTERNS.some(pattern => pattern.test(filePath))) {
    return false;
  }

  // check for signs of generated/compiled code
  if (content) {
    if (IGNORED_FILE_CONTENTS.some(pattern => pattern.test(content))) {
      return false;
    }

    const indicators = {
      hasSourceMap: content.includes('sourceMappingURL'),
      hasWebpackArtifacts: content.includes('__webpack_'),
      isMinified: /^[!function\(][^]{200,}[;\)}]$/m.test(content),
      isGenerated: /(@generated|DO NOT EDIT|Auto-generated)/i.test(content)
    };

    if (Object.values(indicators).some(Boolean)) {
      return false;
    }
  }

  return true;
}