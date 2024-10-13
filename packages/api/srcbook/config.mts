export function buildJSPackageJson() {
  return {
    type: 'module',
    devDependencies: {
      prettier: 'latest',
    },
    prettier: {
      semi: true,
      singleQuote: true,
    },
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
    devDependencies: {
      prettier: 'latest',
    },
    prettier: {
      semi: true,
      singleQuote: true,
    },
  };
}

export function buildTsconfigJson() {
  return {
    compilerOptions: {
      types: [],
      strict: true,
      module: 'nodenext',
      moduleResolution: 'nodenext',
      target: 'es2022',
      resolveJsonModule: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      noPropertyAccessFromIndexSignature: true,
    },
    include: ['src/**/*', 'env.d.ts'],
    exclude: ['node_modules'],
  };
}
