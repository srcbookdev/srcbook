import chalk from 'chalk';
import type { TestSummary, TestResult, AppTestResult } from './types.js';

export function reportResults(summary: TestSummary): void {
  console.log('\nWeb App Generator Notebook Test Results:');
  console.log('=====================================\n');
  
  // Report notebook results
  console.log('Notebooks:');
  console.log(`Total: ${summary.totalNotebooks}`);
  console.log(`Passed: ${chalk.green(summary.passedNotebooks)}`);
  console.log(`Failed: ${chalk.red(summary.failedNotebooks)}\n`);
  
  // Report generated app results
  console.log('Generated Apps:');
  console.log(`Total: ${summary.generatedApps.total}`);
  console.log(`Passed: ${chalk.green(summary.generatedApps.passed)}`);
  console.log(`Failed: ${chalk.red(summary.generatedApps.failed)}\n`);
  
  // Report individual notebook results
  for (const result of summary.results) {
    reportNotebookResult(result);
  }
}

function reportNotebookResult(result: TestResult): void {
  const status = result.success ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`${status} ${result.notebookPath}`);
  
  if (!result.success && result.error) {
    console.log(chalk.red(`  Error: ${result.error}`));
  }
  
  // Report cell results
  console.log('\n  Cells:');
  for (const cell of result.cells) {
    const cellStatus = cell.success ? chalk.green('✓') : chalk.red('✗');
    console.log(`    ${cellStatus} ${cell.type} cell ${cell.id}`);
    if (!cell.success && cell.error) {
      console.log(chalk.red(`      ${cell.error}`));
    }
  }
  
  // Report generated app results if any
  if (result.generatedApp) {
    reportAppResult(result.generatedApp);
  }
  
  console.log('');
}

function reportAppResult(app: AppTestResult): void {
  console.log('\n  Generated App:');
  console.log(`  Path: ${app.path}`);
  
  const status = app.success ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`  Status: ${status}`);
  
  if (!app.success && app.error) {
    console.log(chalk.red(`  Error: ${app.error}`));
  }
  
  // Report component test results
  console.log('\n  Components:');
  for (const component of app.components) {
    const componentStatus = component.success ? chalk.green('✓') : chalk.red('✗');
    console.log(`    ${componentStatus} ${component.type} ${component.name}`);
    if (!component.success && component.error) {
      console.log(chalk.red(`      ${component.error}`));
    }
  }
  
  // Report E2E test results
  console.log('\n  E2E Tests:');
  for (const test of app.e2eTests) {
    const testStatus = test.success ? chalk.green('✓') : chalk.red('✗');
    console.log(`    ${testStatus} ${test.name}`);
    
    if (!test.success) {
      for (const step of test.steps) {
        if (!step.success) {
          console.log(chalk.red(`      × ${step.description}`));
          if (step.error) {
            console.log(chalk.red(`        ${step.error}`));
          }
        }
      }
    }
  }
}
