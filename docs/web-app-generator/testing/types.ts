export interface TestResult {
  appPath: string;
  components: ComponentResult[];
  e2eTests: E2ETestResult[];
  success: boolean;
  error?: string;
}

export interface ComponentResult {
  name: string;
  type: 'component' | 'page' | 'layout';
  renderTests: boolean;
  interactionTests: boolean;
  success: boolean;
  error?: string;
}

export interface E2ETestResult {
  name: string;
  steps: TestStep[];
  success: boolean;
  error?: string;
  screenshots?: string[];
}

export interface TestStep {
  description: string;
  success: boolean;
  error?: string;
}

export interface TestSummary {
  totalApps: number;
  passedApps: number;
  failedApps: number;
  results: TestResult[];
}
