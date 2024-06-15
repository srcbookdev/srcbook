#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Building shared...');
execSync('pnpm --filter shared build', { stdio: 'inherit' });

console.log('Building client...');
execSync('pnpm --filter web build', { stdio: 'inherit' });

console.log('Moving client files to api/client_dist/ ...');
execSync('cp -R packages/web/dist/* srcbook/client_dist', { stdio: 'inherit' });

console.log('Building api...');
execSync('pnpm --filter api build', { stdio: 'inherit' });

console.log('Moving api files to api/dist/ ...');
execSync('cp -R packages/api/dist/* srcbook/dist', { stdio: 'inherit' });
