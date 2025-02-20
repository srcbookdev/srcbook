export interface TestResult {
  notebookPath: string;
  cells: CellResult[];
  success: boolean;
  error?: string;
  generatedApp?: AppTestResult;
}

export interface CellResult {
  id: string;
  type: 'code' | 'markdown';
  success: boolean;
  error?: string;
  output?: any;
}

export interface AppTestResult {
  path: string;
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
  totalNotebooks: number;
  passedNotebooks: number;
  failedNotebooks: number;
  results: TestResult[];
  generatedApps: {
    total: number;
    passed: number;
    failed: number;
  };
}
