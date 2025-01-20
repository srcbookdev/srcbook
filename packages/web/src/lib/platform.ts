// Define supported platforms and architectures
type SupportedPlatform = 'darwin' | 'linux';
type SupportedArch = 'arm64' | 'x64';

export function getRuntimeEnvironment() {
  return {
    isDocker: process.env.CONTAINER === 'true',
    arch: process.arch as SupportedArch,
    platform: process.platform as SupportedPlatform
  };
}

export function getRollupPlatform() {
  const { isDocker, arch, platform } = getRuntimeEnvironment();
  
  if (isDocker) {
    // Force x64 for Docker builds regardless of host architecture
    return 'linux-x64-musl';
  }

  // Native platforms
  const platforms: Record<SupportedPlatform, Record<SupportedArch, string>> = {
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

// Expose environment info to Vite config
export function getViteEnvironment() {
  const { isDocker } = getRuntimeEnvironment();
  const rollupPlatform = getRollupPlatform();
  
  return {
    isDocker,
    rollupPlatform,
    // Add any other environment-specific configs needed for Vite
  };
}