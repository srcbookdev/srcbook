import { runTests } from './test-runner.js';
import { reportResults } from './reporter.js';

async function main() {
  try {
    console.log('Starting web app generator notebook tests...');
    
    // Run tests from the root docs directory
    const summary = await runTests('../../../');
    reportResults(summary);
    
    // Exit with error code if any tests failed
    const exitCode = summary.failedNotebooks > 0 || summary.generatedApps.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

main();
