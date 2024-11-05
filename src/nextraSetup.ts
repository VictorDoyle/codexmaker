import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

// pause for now
async function checkDependencies() {
  const requiredPackages = ['nextra', 'react', 'react-dom'];
  const installedPackages = new Set(Object.keys(require(path.join(process.cwd(), 'package.json')).dependencies || {}));

  const missingPackages = requiredPackages.filter(pkg => !installedPackages.has(pkg));

  if (missingPackages.length > 0) {
    console.log(`Missing dependencies detected: ${missingPackages.join(', ')}`);
    console.log(`Installing missing packages...`);

    // if missing deps install TODO: user prompt here
    try {
      execSync(`npm install ${missingPackages.join(' ')}`, { stdio: 'inherit' });
      console.log(`Successfully installed: ${missingPackages.join(', ')}`);
    } catch (error) {
      console.error('Failed to install missing packages:', error);
      throw new Error('Dependency installation failed. Please install the required packages manually.');
    }
  } else {
    console.log('All required dependencies are already installed.');
  }
}

async function setupNextra(outputDir: string): Promise<void> {
  const nextConfigPath = path.join(outputDir, 'next.config.mjs');
  const themeConfigPath = path.join(outputDir, 'theme.config.tsx');

  const nextConfigContent = `
import withNextra from 'nextra';

export default withNextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
});
  `;

  await fs.writeFile(nextConfigPath, nextConfigContent);
  /* FIXME: scrape username or warrant it in CLI */
  const projectName = path.basename(process.cwd());
  const themeConfigContent = `
import React from 'react';

export default {
  projectLink: 'https://github.com/yourusername/${projectName}', // Dynamic project link
  docsRepositoryBase: 'https://github.com/yourusername/${projectName}/blob/main',
  titleSuffix: ' – ${projectName}',
  logo: (
    <>
      <span>${projectName} Documentation</span>
    </>
  ),
  search: true,
  footer: {
    text: 'MIT 2024 © Your Name',
  },
};
  `;

  await fs.writeFile(themeConfigPath, themeConfigContent);

  console.log(`Nextra setup completed. Check ${outputDir} for next.config.mjs and theme.config.tsx.`);
}

export default setupNextra;
