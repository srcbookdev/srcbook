import { readFile } from 'fs/promises';
import { marked } from 'marked';
import { z } from 'zod';
import chalk from 'chalk';
import * as ts from 'typescript';
import * as path from 'path';

// Schema for test results
const TestResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  output: z.unknown().optional()
});

type TestResult = z.infer<typeof TestResultSchema>;

interface CodeBlock {
  code: string;
  lang: string;
}

interface MarkedToken {
  type: string;
  text?: string;
  lang?: string;
  raw?: string;
}

async function parseNotebook(content: string): Promise<CodeBlock[]> {
  const tokens = marked.lexer(content) as MarkedToken[];
  const codeBlocks = tokens.filter(token => 
    token.type === 'code' && 
    token.text &&
    token.lang &&
    (token.lang === 'typescript' || token.lang === 'javascript')
  );
  
  return codeBlocks.map(block => ({
    code: block.text!,
    lang: block.lang!
  }));
}

function createCompilerHost(options: ts.CompilerOptions): ts.CompilerHost {
  return {
    getSourceFile: (fileName, languageVersion) => {
      if (fileName === 'test.ts') {
        return ts.createSourceFile(fileName, '', languageVersion);
      }
      // Provide empty content for all imported files
      return ts.createSourceFile(fileName, 'export {};', languageVersion);
    },
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    getCanonicalFileName: fileName => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: () => true,
    readFile: () => '',
    getDefaultLibFileName: () => 'lib.d.ts',
    resolveModuleNames: (moduleNames, containingFile) => {
      return moduleNames.map(moduleName => ({
        resolvedFileName: path.join('/', moduleName + '.ts'),
        isExternalLibraryImport: false,
        extension: '.ts'
      }));
    }
  };
}

function validateTypeScript(code: string): TestResult {
  // Add module context for top-level await
  const processedCode = `
    // @ts-nocheck
    declare global {
      interface Window {}
      interface Document {}
      interface Navigator {}
      interface Console {}
      var window: Window;
      var document: Document;
      var navigator: Navigator;
      var console: Console;
      var localStorage: Storage;
    }
    export {};
    ${code}
  `;

  // Create compiler options
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: false,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmit: true,
    lib: ['es2022', 'dom'],
    types: ['node'],
    allowJs: true,
    checkJs: false,
    noImplicitAny: false,
    noImplicitThis: false,
    noUnusedLocals: false,
    noUnusedParameters: false
  };

  // Create a program
  const fileName = 'test.ts';
  const sourceFile = ts.createSourceFile(
    fileName,
    processedCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const host = createCompilerHost(compilerOptions);
  const program = ts.createProgram({
    rootNames: [fileName],
    options: compilerOptions,
    host: {
      ...host,
      getSourceFile: (name) => 
        name === fileName ? sourceFile : host.getSourceFile(name, ts.ScriptTarget.Latest),
    }
  });

  // Get diagnostics
  const diagnostics = program.getSemanticDiagnostics(sourceFile);

  if (diagnostics.length > 0) {
    const errors = diagnostics
      .filter(d => d.category === ts.DiagnosticCategory.Error)
      .map(diagnostic => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        if (diagnostic.file && diagnostic.start) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          return `Line ${line + 1}, Column ${character + 1}: ${message}`;
        }
        return message;
      });
    
    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('\n')
      };
    }
  }

  return { success: true };
}

async function runTests(notebookPath: string): Promise<void> {
  try {
    const content = await readFile(notebookPath, 'utf-8');
    const blocks = await parseNotebook(content);
    
    console.log(chalk.blue(`Testing ${blocks.length} code blocks...\n`));
    
    let passed = 0;
    let failed = 0;
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const result = validateTypeScript(block.code);
      
      if (result.success) {
        console.log(chalk.green(`✓ Block ${i + 1} passed`));
        passed++;
      } else {
        console.log(chalk.red(`✗ Block ${i + 1} failed:`));
        console.log(chalk.red(`  ${result.error}`));
        failed++;
      }
    }
    
    console.log(chalk.blue('\nTest Summary:'));
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(chalk.blue(`Total: ${blocks.length}\n`));
    
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error running tests:'));
    console.error(error);
    process.exit(1);
  }
}

// Get notebook path from command line
const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error(chalk.red('Please provide a notebook path'));
  process.exit(1);
}

runTests(notebookPath).catch(error => {
  console.error(chalk.red('Fatal error:'));
  console.error(error);
  process.exit(1);
});