#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Building shared...');
execSync('pnpm --filter shared build', { stdio: 'inherit' });

console.log('Building client...');
execSync('pnpm --filter web build', { stdio: 'inherit' });

console.log('Moving client files to srcbook/web_dist/ ...');
execSync('rm -rf srcbook/web_dist/', { stdio: 'inherit' });
execSync('mkdir srcbook/web_dist/', { stdio: 'inherit' });
execSync('cp -R packages/web/dist/* srcbook/web_dist', { stdio: 'inherit' });

console.log('Building api...');
execSync('pnpm --filter api build', { stdio: 'inherit' });

console.log('Moving api files to api/dist/ ...');
execSync('rm -rf srcbook/dist/', { stdio: 'inherit' });
execSync('mkdir srcbook/dist/', { stdio: 'inherit' });
execSync('cp -R packages/api/dist/* srcbook/dist', { stdio: 'inherit' });

console.log('Add the entrypoint run.mjs to srcbook/dist/ ...');
execSync('cp srcbook/run.mjs srcbook/dist/run.mjs', { stdio: 'inherit' });
