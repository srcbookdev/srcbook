import chalk from 'chalk';
import puppeteer from 'puppeteer';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import type { TestResult, ComponentResult, E2ETestResult, TestSummary } from './types.js';
import { findWebApps, loadAppConfig } from './app-loader.js';

async function startDevServer(path: string): Promise<void> {
  return new Promise((resolve) => {
    const server = spawn('npm', ['run', 'dev'], {
      cwd: path,
      stdio: 'ignore'
    });
    
    // Give the server time to start
    setTimeout(() => {
      resolve();
    }, 5000);
  });
}

export async function runTests(dir: string): Promise<TestSummary> {
  const apps = await findWebApps(dir);
  const results: TestResult[] = [];
  
  for (const app of apps) {
    try {
      const config = await loadAppConfig(app);
      const result = await testWebApp(app, config);
      results.push({
        appPath: app,
        ...result
      });
    } catch (error) {
      results.push({
        appPath: app,
        components: [],
        e2eTests: [],
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return summarizeResults(results);
}

async function testWebApp(path: string, config: any): Promise<Omit<TestResult, 'appPath'>> {
  // Start dev server
  await startDevServer(path);
  
  const components = await testComponents(path);
  const e2eTests = await runE2ETests(path);
  
  const success = components.every(c => c.success) && 
                 e2eTests.every(t => t.success);
  
  return {
    components,
    e2eTests,
    success
  };
}

async function testComponents(path: string): Promise<ComponentResult[]> {
  const results: ComponentResult[] = [];
  
  try {
    // Test App component
    const appResult: ComponentResult = {
      name: 'App',
      type: 'component',
      renderTests: true,
      interactionTests: true,
      success: true
    };
    
    // Verify App.tsx exists
    const appPath = join(path, 'src/App.tsx');
    await readFile(appPath, 'utf-8');
    
    // Launch browser for component testing
    const browser = await puppeteer.launch();
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:3000');
      
      // Test component rendering
      const app = await page.$('.app');
      if (!app) {
        appResult.success = false;
        appResult.error = 'App component not rendered';
      }
      
      // Test counter functionality
      const button = await page.$('button');
      if (button) {
        const counterBefore = await page.$eval('.counter p', el => el.textContent);
        await button.click();
        const counterAfter = await page.$eval('.counter p', el => el.textContent);
        
        if (counterBefore === counterAfter) {
          appResult.success = false;
          appResult.error = 'Counter did not update after click';
        }
      } else {
        appResult.success = false;
        appResult.error = 'Counter button not found';
      }
    } finally {
      await browser.close();
    }
    
    results.push(appResult);
  } catch (error) {
    results.push({
      name: 'App',
      type: 'component',
      renderTests: false,
      interactionTests: false,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  return results;
}

async function runE2ETests(path: string): Promise<E2ETestResult[]> {
  const results: E2ETestResult[] = [];
  const browser = await puppeteer.launch();
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');
    
    // Test counter flow
    const counterTest: E2ETestResult = {
      name: 'Counter Flow',
      steps: [],
      success: true
    };
    
    // Step 1: Initial render
    try {
      const initialCount = await page.$eval('.counter p', el => el.textContent);
      counterTest.steps.push({
        description: 'Initial render',
        success: initialCount === 'Count: 0',
        error: initialCount !== 'Count: 0' ? `Expected 'Count: 0' but got '${initialCount}'` : undefined
      });
    } catch (error) {
      counterTest.steps.push({
        description: 'Initial render',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Step 2: Click counter
    try {
      const button = await page.$('button');
      if (!button) throw new Error('Counter button not found');
      
      await button.click();
      const countAfterClick = await page.$eval('.counter p', el => el.textContent);
      
      counterTest.steps.push({
        description: 'Counter increment',
        success: countAfterClick === 'Count: 1',
        error: countAfterClick !== 'Count: 1' ? `Expected 'Count: 1' but got '${countAfterClick}'` : undefined
      });
    } catch (error) {
      counterTest.steps.push({
        description: 'Counter increment',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Take screenshot
    const screenshot = await page.screenshot();
    counterTest.screenshots = [screenshot.toString('base64')];
    
    // Update overall test success
    counterTest.success = counterTest.steps.every(step => step.success);
    results.push(counterTest);
    
  } catch (error) {
    results.push({
      name: 'Counter Flow',
      steps: [{
        description: 'Test setup',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }],
      success: false
    });
  } finally {
    await browser.close();
  }
  
  return results;
}

function summarizeResults(results: TestResult[]): TestSummary {
  const totalApps = results.length;
  const passedApps = results.filter(r => r.success).length;
  const failedApps = totalApps - passedApps;
  
  return {
    totalApps,
    passedApps,
    failedApps,
    results
  };
}
