import { validateArchitecture, reportValidation } from './architecture-validator.js';

async function main() {
  try {
    console.log('Starting architecture validation tests...');
    
    const results = await validateArchitecture();
    reportValidation(results);
    
    // Exit with error if any components are not fully implemented
    // or have missing features
    const hasFailures = results.some(r => !r.implemented || r.missingFeatures.length > 0);
    
    if (hasFailures) {
      console.log('\nArchitecture validation failed - documentation and implementation are out of sync');
      process.exit(1);
    } else {
      console.log('\nArchitecture validation passed - documentation and implementation are in sync');
      process.exit(0);
    }
  } catch (error) {
    console.error('Architecture validation failed:', error);
    process.exit(1);
  }
}

main();