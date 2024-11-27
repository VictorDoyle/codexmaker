import { execSync } from 'child_process';

async function setupNextra(outputDir: string): Promise<void> {
  console.log('Nextra setup complete. Starting development server...');
  try {
    execSync('npm run dev', {
      cwd: outputDir,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Failed to start development server:', error);
  }
}

export default setupNextra;