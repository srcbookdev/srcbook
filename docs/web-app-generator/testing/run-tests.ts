import { runTests } from './test-runner.js';
import { reportResults } from './reporter.js';

async function main() {
  try {
    console.log('Starting web app tests...');
    const summary = await runTests('./apps');
    reportResults(summary);
    process.exit(summary.failedApps > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

main();
