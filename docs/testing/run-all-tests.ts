import { glob } from 'glob';
import { spawn } from 'child_process';
import chalk from 'chalk';
import * as path from 'path';

async function findNotebooks(): Promise<string[]> {
  return glob('../**/*.src.md', {
    ignore: ['**/node_modules/**']
  });
}

async function runTest(notebook: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(chalk.blue(`\nTesting ${notebook}...\n`));
    
    const test = spawn('npx', ['tsx', 'run-tests.ts', notebook], {
      stdio: 'inherit'
    });
    
    test.on('close', (code) => {
      const success = code === 0;
      if (success) {
        console.log(chalk.green(`\n✓ ${notebook} passed\n`));
      } else {
        console.log(chalk.red(`\n✗ ${notebook} failed\n`));
      }
      resolve(success);
    });
  });
}

async function main() {
  const notebooks = await findNotebooks();
  console.log(chalk.blue(`Found ${notebooks.length} notebooks to test\n`));
  
  let passed = 0;
  let failed = 0;
  
  for (const notebook of notebooks) {
    const success = await runTest(notebook);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(chalk.blue('\nTest Summary:'));
  console.log(chalk.green(`Passed: ${passed}`));
  console.log(chalk.red(`Failed: ${failed}`));
  console.log(chalk.blue(`Total: ${notebooks.length}\n`));
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);