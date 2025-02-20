import chalk from 'chalk';
import type { TestSummary, TestResult, ComponentResult, E2ETestResult } from './types.js';

export function reportResults(summary: TestSummary): void {
  console.log('\nWeb App Test Results:');
  console.log('====================\n');
  
  console.log(`Total Apps: ${summary.totalApps}`);
  console.log(`Passed: ${chalk.green(summary.passedApps)}`);
  console.log(`Failed: ${chalk.red(summary.failedApps)}\n`);
  
  for (const result of summary.results) {
    reportAppResult(result);
  }
}

function reportAppResult(result: TestResult): void {
  const status = result.success ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`${status} ${result.appPath}`);
  
  if (!result.success && result.error) {
    console.log(chalk.red(`  Error: ${result.error}`));
  }
  
  console.log('\n  Components:');
  for (const component of result.components) {
    reportComponentResult(component);
  }
  
  console.log('\n  E2E Tests:');
  for (const test of result.e2eTests) {
    reportE2EResult(test);
  }
  
  console.log('');
}

function reportComponentResult(component: ComponentResult): void {
  const status = component.success ? chalk.green('✓') : chalk.red('✗');
  console.log(`    ${status} ${component.type} ${component.name}`);
  if (!component.success && component.error) {
    console.log(chalk.red(`      ${component.error}`));
  }
}

function reportE2EResult(test: E2ETestResult): void {
  const status = test.success ? chalk.green('✓') : chalk.red('✗');
  console.log(`    ${status} ${test.name}`);
  
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
