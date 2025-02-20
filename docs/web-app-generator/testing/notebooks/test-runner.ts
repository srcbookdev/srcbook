import chalk from 'chalk';
import puppeteer from 'puppeteer';
import { join } from 'path';
import { spawn } from 'child_process';
import type { TestResult, CellResult, TestSummary, AppTestResult } from './types.js';
import { findNotebooks, loadNotebook, parseCodeCells } from './notebook-loader.js';

export async function runTests(dir: string): Promise<TestSummary> {
  const notebooks = await findNotebooks(dir);
  const results: TestResult[] = [];
  let totalApps = 0;
  let passedApps = 0;
  let failedApps = 0;
  
  for (const notebook of notebooks) {
    try {
      const content = await loadNotebook(notebook);
      const result = await testNotebook(content, notebook);
      
      if (result.generatedApp) {
        totalApps++;
        if (result.generatedApp.success) passedApps++;
        else failedApps++;
      }
      
      results.push({
        notebookPath: notebook,
        ...result
      });
    } catch (error) {
      results.push({
        notebookPath: notebook,
        cells: [],
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return {
    totalNotebooks: notebooks.length,
    passedNotebooks: results.filter(r => r.success).length,
    failedNotebooks: results.filter(r => !r.success).length,
    results,
    generatedApps: {
      total: totalApps,
      passed: passedApps,
      failed: failedApps
    }
  };
}

async function testNotebook(content: string, path: string): Promise<Omit<TestResult, 'notebookPath'>> {
  const cells = parseCodeCells(content);
  const cellResults: CellResult[] = [];
  let appResult: AppTestResult | undefined;
  
  // Create temporary directory for generated app
  const appDir = join('testing/temp', path.replace('.src.md', ''));
  
  for (const [index, cell] of cells.entries()) {
    try {
      // Execute cell
      const result = await executeCell(cell, appDir);
      cellResults.push({
        id: `cell-${index + 1}`,
        type: 'code',
        success: true,
        output: result
      });
      
      // If cell generates an app, test it
      if (result && typeof result === 'string' && result.includes('App generated at')) {
        appResult = await testGeneratedApp(appDir);
      }
    } catch (error) {
      cellResults.push({
        id: `cell-${index + 1}`,
        type: 'code',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  const success = cellResults.every(c => c.success) && (!appResult || appResult.success);
  
  return {
    cells: cellResults,
    success,
    generatedApp: appResult
  };
}

async function executeCell(code: string, appDir: string): Promise<any> {
  // Skip empty cells
  if (!code.trim()) return null;
  
  try {
    // Transform import statements to dynamic imports
    const transformedCode = code.replace(
      /import\s+(?:(\*\s+as\s+)?\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g,
      (match, star, source) => {
        if (star) {
          return `const module = await import('${source}');`;
        }
        const imports = match.match(/\{([^}]*)\}/);
        if (imports) {
          const names = imports[1].split(',').map(n => n.trim());
          return `const { ${names.join(', ')} } = await import('${source}');`;
        }
        const nameMatch = match.match(/import\s+(\w+)/);
        if (!nameMatch) {
          throw new Error('Invalid import statement');
        }
        const name = nameMatch[1];
        return `const ${name} = (await import('${source}')).default;`;
      }
    );
    
    // Create a context for code execution
    const context = {
      appDir,
      process,
      console,
      Buffer,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      __dirname: appDir,
      __filename: join(appDir, 'cell.js'),
      fetch,
      URL,
      URLSearchParams
    };
    
    // Execute the transformed code
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(...Object.keys(context), transformedCode);
    const result = await fn(...Object.values(context));
    
    // If the result includes "App generated at", store the app path
    if (typeof result === 'string' && result.includes('App generated at')) {
      const match = result.match(/App generated at (.+)/);
      if (match) {
        return `App generated at ${match[1]}`;
      }
    }
    
    return result;
  } catch (error) {
    throw new Error(`Cell execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testGeneratedApp(appDir: string): Promise<AppTestResult> {
  // Start dev server
  const server = spawn('npm', ['run', 'dev'], {
    cwd: appDir,
    stdio: 'ignore'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');
    
    // Test app rendering
    const app = await page.$('#root');
    if (!app) {
      throw new Error('App not rendered');
    }
    
    // Take screenshot
    const screenshot = await page.screenshot();
    
    return {
      path: appDir,
      components: [{
        name: 'App',
        type: 'component',
        renderTests: true,
        interactionTests: false,
        success: true
      }],
      e2eTests: [{
        name: 'Initial Render',
        steps: [{
          description: 'App loads',
          success: true
        }],
        success: true,
        screenshots: [screenshot.toString('base64')]
      }],
      success: true
    };
  } catch (error) {
    return {
      path: appDir,
      components: [],
      e2eTests: [],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await browser.close();
    server.kill();
  }
}
