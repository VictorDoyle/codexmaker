import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import { GitAnalyzer } from './analytics/gitAnalyzer';
import { AnalyticsGenerator } from './generators/analyticsGenerator';


process.on('SIGINT', () => {
  console.log('\nProcess interrupted. Exiting...');
  process.exit(1);
});

async function promptForProjectName() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter the GitHub Project Name: (this will autofill links to your github, logo, etc)',
      default: path.basename(process.cwd()),
    },
  ]);

  return answers.projectName;
}

async function promptForGithubUsername() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'githubUsername',
      message: 'Enter your GitHub username: (this will be used for github links)',
      default: 'yourusername',
    },
  ]);

  return answers.githubUsername;
}

/**
 * Testing if this erases my original comment
 * @param array $numbers An array of integers.
 * @return int The maximum integer in the array.
 * @throws InvalidArgumentException If the array is empty.
 */
async function checkDependencies(outputDir: string) {
  const requiredPackages = [
    'next', 'react', 'react-dom', 'nextra', 'nextra-theme-docs', 'typescript', '@types/node',
    'simple-git', 'tree-sitter', 'tree-sitter-typescript'
  ];
  const packageJsonPath = path.join(outputDir, 'package.json');

  if (!await fs.pathExists(packageJsonPath)) {
    const packageJsonContent = {
      name: `${path.basename(process.cwd())}-docs`,
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
        'react-dom': '^18.2.0',
        'simple-git': '^3.22.0',
        'tree-sitter': '^0.20.6',
        'tree-sitter-typescript': '^0.20.3'
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

async function generateNextraConfig(outputDir: string, functionData: any[], projectName: string, githubUsername: string) {
  const pagesDir = path.join(outputDir, 'pages');
  const publicDir = path.join(outputDir, 'public');
  const nextConfigPath = path.join(outputDir, 'next.config.mjs');

  const nextConfigContent = `
  import nextra from 'nextra'

  const withNextra = nextra({
    theme: 'nextra-theme-docs',
    themeConfig: './theme.config.tsx',
  })

  export default withNextra()
    `;
  await fs.writeFile(nextConfigPath, nextConfigContent);
  await fs.ensureDir(pagesDir);
  await fs.ensureDir(publicDir);

  const functionsDir = path.join(pagesDir, 'functions');
  const analyticsDir = path.join(pagesDir, 'analytics');
  await fs.ensureDir(functionsDir);
  await fs.ensureDir(analyticsDir);

  const indexMdx = `# ${projectName}

Welcome to the Documentation Website for ${projectName}. 

## Quick Overview
This documentation provides a detailed reference for all functions in the entire codebase.

## Navigation
- Use the sidebar to explore different functions
- Check out the Analytics section for code insights
- Each function has its own detailed documentation page
- The website is fully indexed and searchable

## Sections
- [Functions](/functions) - Complete function documentation
- [Analytics](/analytics) - Code insights and dependencies

## Customizing it to your liking
- If you need to modify themes, you can
- When regenerating the documentation, pre-existing files will not be modified or removed.
`;
  await fs.writeFile(path.join(pagesDir, 'index.mdx'), indexMdx);

  // Generate function pages
  for (const functionInfo of functionData) {
    const { name, code, codeLang, description, parameters, returnType } = functionInfo;
    const functionTitle = name.charAt(0).toUpperCase() + name.slice(1);

    const mdxContent = `
# ${functionTitle}

## Function Description
${description || 'No description provided.'}

## Function Code
<pre><code>
  this is a ${codeLang} lang file
\`\`\`${codeLang} showLineNumbers
  ${code}
  \`\`\`
</code></pre>


### Parameters
\`\`\`
${parameters && parameters.length > 0
        ? parameters.map((param: { name: string; type: string; description: string }) => `- \`${param.name}\`: ${param.type} - ${param.description}`).join('\n')
        : 'No parameters specified.'}
\`\`\`

### Return Value

- Type: \`\`\`${returnType || 'Unknown'} \`\`\`

${description || 'No additional return value description available.'}

### Usage Example
\`\`\`javascript
Add an example of how to use this function
\`\`\`
    `;

    const mdxFilePath = path.join(functionsDir, `${name}.mdx`);
    await fs.writeFile(mdxFilePath, mdxContent);
  }

  // make analytics pages
  console.log('Generating analytics data...');
  const gitAnalyzer = new GitAnalyzer(process.cwd());
  const analyticsData = await gitAnalyzer.analyze();
  const analyticsGenerator = new AnalyticsGenerator(outputDir, analyticsData);
  await analyticsGenerator.generate();
  console.log('Analytics generation complete');

  const themeConfigPath = path.join(outputDir, 'theme.config.tsx');
  const themeConfigContent = `
import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>${projectName}</span>,
  project: {
    link: 'https://github.com/${githubUsername}/${projectName}',
  },
  docsRepositoryBase: 'https://github.com/${githubUsername}/${projectName}/blob/main/docs',
  sidebar: {
    defaultMenuCollapseLevel: 2,
    toggleButton: true,
    autoCollapse: true,
    titleComponent: ({ title }) => <>{title}</>
  },
  footer: {
    text: 'MIT 2024 © ${projectName}',
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
async function generateDocs(functionData: any[], outputDir: string): Promise<void> {
  const projectName = await promptForProjectName();
  const githubUsername = await promptForGithubUsername();
  await checkDependencies(outputDir);
  await generateNextraConfig(outputDir, functionData, projectName, githubUsername);

  console.log('Installing dependencies...');
  execSync('npm install', { cwd: outputDir, stdio: 'inherit' });

  console.log('Documentation generation complete. Run "npm run dev" to start your documentation site.');
}

export default generateDocs;