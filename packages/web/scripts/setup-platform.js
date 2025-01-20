#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import process from 'process';

function getRollupPlatform() {
  const isDocker = process.env.CONTAINER === 'true';
  const arch = process.arch;
  const platform = process.platform;
  
  if (isDocker) {
    return 'linux-x64-musl';
  }

  const platforms = {
    darwin: {
      arm64: 'darwin-arm64',
      x64: 'darwin-x64'
    },
    linux: {
      arm64: 'linux-arm64-musl',
      x64: 'linux-x64-musl'
    }
  };

  return platforms[platform]?.[arch] ?? null;
}

// Set the environment variable
process.env.ROLLUP_NATIVE_PLATFORM = getRollupPlatform();