export function buildJSPackageJson() {
  return {
    type: 'module',
    dependencies: {},
  };
}

export function buildTSPackageJson() {
  return {
    type: 'module',
    dependencies: {
      tsx: 'latest',
      typescript: 'latest',
      '@types/node': 'latest',
    },
  };
}

export function buildTsconfigJson() {
  return {
    compilerOptions: {
      module: 'nodenext',
      moduleResolution: 'nodenext',
      target: 'es2022',
      resolveJsonModule: true,
      noEmit: true,
      allowImportingTsExtensions: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  };
}
