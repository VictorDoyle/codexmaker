import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

interface MetaPage {
  title: string;
  type: 'page';
  href?: string;
  newWindow?: boolean;
}

async function checkDependencies(outputDir: string) {
  const requiredPackages = [
    'next', 'react', 'react-dom', 'nextra', 'nextra-theme-docs', 'typescript', '@types/node'
  ];
  const packageJsonPath = path.join(outputDir, 'package.json');

  // make basic package.json if none found
  if (!await fs.pathExists(packageJsonPath)) {
    const projectName = path.basename(process.cwd());
    const packageJsonContent = {
      name: `${projectName}-docs`,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      },
      dependencies: {
        'next': '^13.4.0',
        'nextra': '^2.8.0',
        'nextra-theme-docs': '^2.8.0',
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/node': '^20.3.1',
        '@types/react': '^18.2.14',
        'typescript': '^5.1.3'
      }
    };
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
  }

  const packageJson = require(packageJsonPath);

  const installedPackages = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {})
  ]);

  const missingPackages = requiredPackages.filter(pkg => !installedPackages.has(pkg));

  if (missingPackages.length > 0) {
    console.log(`Missing dependencies detected: ${missingPackages.join(', ')}`);
    console.log('Installing missing packages...');
    try {
      execSync(`npm install ${missingPackages.join(' ')} --save-dev`, {
        stdio: 'inherit',
        cwd: outputDir
      });
      console.log(`Successfully installed: ${missingPackages.join(', ')}`);
    } catch (error) {
      console.error('Failed to install missing packages:', error);
      throw new Error('Dependency installation failed. Please install the required packages manually.');
    }
  } else {
    console.log('All required dependencies are already installed.');
  }
}
async function generateNextraConfig(outputDir: string, functionData: any[]) {
  const pagesDir = path.join(outputDir, 'pages');
  const publicDir = path.join(outputDir, 'public');

  await fs.ensureDir(pagesDir);
  await fs.ensureDir(publicDir);

  const functionsDir = path.join(pagesDir, 'functions');
  await fs.ensureDir(functionsDir);

  // need this for dynamic sidebar build
  const meta: Record<string, MetaPage | Record<string, MetaPage>> = {
    index: {
      title: 'Overview',
      type: 'page'
    },
    functions: {} // init nested Record<string, MetaPage>
  };

  // TODO: Clearup index page
  const indexMdx = `# Project Documentation

Welcome to the comprehensive project documentation. 

## Quick Overview
This documentation provides a detailed reference for all functions in the project. 

### Navigation
- Use the sidebar to explore different functions
- Each function has its own detailed documentation page

## Getting Started
Browse through the available functions in the sidebar.
`;
  await fs.writeFile(path.join(pagesDir, 'index.mdx'), indexMdx);

  // FIXME: MDX Parsing issues with non escaped chars - look into this
  function escapeCodeBlock(code: string): string {
    return code
      .replace(/\{/g, '&#123;')  // Escape opening curly brace
      .replace(/\}/g, '&#125;')  // Escape closing curly brace
      .replace(/</g, '&lt;')     // Escape angle brackets
      .replace(/>/g, '&gt;');    // Escape angle brackets
  }

  // gen MDX pages for each function
  for (const functionInfo of functionData) {
    const { name, code, description, parameters, returnType } = functionInfo;

    const functionTitle = name.charAt(0).toUpperCase() + name.slice(1);

    const mdxContent = `
# ${functionTitle}

## Function Description
${description || 'No description provided.'}

## Function Code
\`\`\`javascript
${escapeCodeBlock(code)}
\`\`\`

### Parameters
${parameters && parameters.length > 0
        ? parameters.map((param: { name: string; type: string; description: string }) => `- \`${param.name}\`: ${param.type} - ${param.description}`).join('\n')
        : 'No parameters specified.'}

### Return Value
- Type: ${returnType || 'Unknown'}
${description || 'No additional return value description available.'}

### Usage Example
\`\`\`javascript
// TODO: Add an example of how to use this function
\`\`\`
    `;

    const mdxFilePath = path.join(functionsDir, `${name}.mdx`);
    await fs.writeFile(mdxFilePath, mdxContent);

    //add to sidebar
    (meta.functions as Record<string, MetaPage>)[name] = {
      title: functionTitle,
      type: 'page'
    };
  }

  // _meta.json for sidebar nav
  const metaContent = JSON.stringify(meta, null, 2);
  await fs.writeFile(path.join(pagesDir, '_meta.json'), metaContent);

  const themeConfigPath = path.join(outputDir, 'theme.config.tsx');
  const themeConfigContent = `
import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>Project Documentation</span>,
  project: {
    link: 'https://github.com/yourusername/your-project',
  },
  docsRepositoryBase: 'https://github.com/yourusername/your-project/blob/main/docs',
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
    titleComponent: ({ title }) => <>{title}</>
  },
  footer: {
    text: 'MIT 2024 © Your Name',
  },
  search: {
    component: null
  },
  navigation: {
    prev: true,
    next: true
  },
  toc: {
    title: 'On This Page',
    extraContent: null
  }
}

export default config
  `;
  await fs.writeFile(themeConfigPath, themeConfigContent);
}

//TODO: Fix this up and cleanup
async function generateDocs(functionData: any[], outputDir: string): Promise<void> {
  await checkDependencies(outputDir);

  await generateNextraConfig(outputDir, functionData);

  console.log('Installing dependencies...');
  execSync('npm install', { cwd: outputDir, stdio: 'inherit' });

  console.log('Documentation generation complete. Run "npm run dev" to start your documentation site.');
}

export default generateDocs;