import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as path from 'path'
import { SRCBOOK_DIR } from '../../constants.mjs'

// Define configs at the top level
const validConfig = {
  mcpServers: {
    test: {
      host: 'http://localhost:3000'
    }
  }
}

const dbConfig = { mcpServers: {} }

// Mock modules after config definitions
vi.mock('../../config.mjs', () => ({
  getConfig: vi.fn().mockResolvedValue(dbConfig),
  updateConfig: vi.fn()
}))

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  }
}))

const baseConfig = {
  baseDir: '/test',
  defaultLanguage: 'en',
  openaiKey: null,
  anthropicKey: null,
  xaiKey: null,
  geminiKey: null,
  enabledAnalytics: false,
  installId: 'test',
  aiProvider: '',
  aiModel: null,
  aiBaseUrl: null,
  subscriptionEmail: null,
  subscriptionId: null,
  subscriptionPlan: null,
  subscriptionStatus: null,
  subscriptionQuantity: null,
  subscriptionCurrentPeriodEnd: null,
  subscriptionFeatures: [],
  subscriptionLimits: {}
}

describe('JSON Parsing', () => {
  const defaultConfigPath = path.join(SRCBOOK_DIR, 'srcbook_mcp_config.json')
  
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('parses valid JSON config', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    
    vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(validConfig))

    const result = await loadMcpConfig()
    expect(result).toEqual(validConfig)
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles empty JSON object', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    const { getConfig } = await import('../../config.mjs')
    
    const emptyConfig = {}
    const dbConfig = { ...baseConfig, mcpServers: null }
    
    vi.mocked(getConfig).mockResolvedValue(dbConfig)
    vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(emptyConfig))

    const result = await loadMcpConfig()
    expect(result).toEqual({ mcpServers: {} })  // Update expectation to match schema
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles malformed JSON', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    
    vi.mocked(fsPromises.default.readFile).mockResolvedValue('{ "mcpServers": {')

    const result = await loadMcpConfig()
    expect(result.mcpServers).toEqual({})
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles non-JSON content', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    
    vi.mocked(fsPromises.default.readFile).mockResolvedValue('This is not JSON content')

    const result = await loadMcpConfig()
    expect(result.mcpServers).toEqual({})
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })
}) 