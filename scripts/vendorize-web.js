#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Building client...');
execSync('pnpm --filter web build', { stdio: 'inherit' });

console.log('Moving client files to api/client_dist/ ...');
execSync('cp -R packages/web/dist/* packages/api/client_dist', { stdio: 'inherit' });
