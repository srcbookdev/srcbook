#!/bin/bash

set -e

echo 'Building srcbook by compiling the shared, web, and api packages to the srcbook/ directory.'
echo 'Building shared...'
pnpm --filter shared build

echo 'Building client...'
pnpm --filter web build

echo 'Moving client files to srcbook/public...'
# Remove everything within srcbook/public except .gitkeep
find srcbook/public ! -name '.gitkeep' -mindepth 1 -exec rm -rf {} +
cp -R packages/web/dist/ srcbook/public

echo 'Building api...'
pnpm --filter api build

echo 'Moving api files to srcbook/lib...'
# Remove everything within srcbook/lib except .gitkeep
find srcbook/lib ! -name '.gitkeep' -mindepth 1 -exec rm -rf {} +
cp -R packages/api/dist/ srcbook/lib/

echo 'All done!'
