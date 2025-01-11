import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as path from 'path'
import { SRCBOOK_DIR } from '../../constants.mjs'

// Mocks must be at top level with static values
vi.mock('../../config.mjs', () => ({
  getConfig: vi.fn(),
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

describe('Schema Validation', () => {
  const defaultConfigPath = path.join(SRCBOOK_DIR, 'srcbook_mcp_config.json')
  
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('accepts valid schema', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    const { getConfig } = await import('../../config.mjs')
    
    const mcpConfig = {
      mcpServers: {
        test: {
          host: 'http://localhost:3000'
        }
      }
    }
    
    vi.mocked(getConfig).mockResolvedValue({...baseConfig, ...mcpConfig})
    vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(mcpConfig))

    const result = await loadMcpConfig()
    expect(result).toEqual(mcpConfig)  // Only expect mcpServers portion
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles missing mcpServers key', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    const { getConfig } = await import('../../config.mjs')
    
    const invalidConfig = {}  // No mcpServers key
    const dbConfig = { ...baseConfig, mcpServers: null }  // Database returns null
    
    vi.mocked(getConfig).mockResolvedValue(dbConfig)
    vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(invalidConfig))

    const result = await loadMcpConfig()
    expect(result).toEqual({ mcpServers: {} })
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  describe('Server Entries', () => {
    test('validates server with required host only', async () => {
      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      const { getConfig } = await import('../../config.mjs')
      
      const mcpConfig = {
        mcpServers: {
          test: {
            host: 'http://localhost:3000'
          }
        }
      }
      
      vi.mocked(getConfig).mockResolvedValue({...baseConfig, ...mcpConfig})
      vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(mcpConfig))

      const result = await loadMcpConfig()
      expect(result).toEqual(mcpConfig)
      expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
    })

    test('validates server with host and tools', async () => {
      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      const { getConfig } = await import('../../config.mjs')
      
      const mcpConfig = {
        mcpServers: {
          test: {
            host: 'http://localhost:3000',
            tools: ['npm', 'node']
          }
        }
      }
      
      vi.mocked(getConfig).mockResolvedValue({...baseConfig, ...mcpConfig})
      vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(mcpConfig))

      const result = await loadMcpConfig()
      expect(result).toEqual(mcpConfig)
      expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
    })

    test('rejects server with invalid host', async () => {
      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      const { getConfig } = await import('../../config.mjs')
      
      const invalidConfig = {
        mcpServers: {
          test: {
            host: 'not-a-url'  // Invalid URL format
          }
        }
      }
      const fallbackConfig = { mcpServers: {} }
      
      vi.mocked(getConfig).mockResolvedValue({...baseConfig, ...fallbackConfig})
      vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(invalidConfig))

      const result = await loadMcpConfig()
      expect(result).toEqual(fallbackConfig)
      expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
    })

    test('rejects server with invalid tools type', async () => {
      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      const { getConfig } = await import('../../config.mjs')
      
      const invalidConfig = {
        mcpServers: {
          test: {
            host: 'http://localhost:3000',
            tools: 'not-an-array'  // Should be an array
          }
        }
      }
      const fallbackConfig = { mcpServers: {} }
      
      vi.mocked(getConfig).mockResolvedValue({...baseConfig, ...fallbackConfig})
      vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(invalidConfig))

      const result = await loadMcpConfig()
      expect(result).toEqual(fallbackConfig)
      expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
    })
  })

  test('validates correct mcpServers structure', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    const { getConfig } = await import('../../config.mjs')
    
    const mcpConfig = {
      mcpServers: {
        server1: {
          host: 'http://localhost:3000'
        },
        server2: {
          host: 'http://localhost:3001',
          tools: ['npm']
        }
      }
    }
    
    vi.mocked(getConfig).mockResolvedValue({...baseConfig, ...mcpConfig})
    vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(mcpConfig))

    const result = await loadMcpConfig()
    expect(result).toEqual(mcpConfig)
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles empty mcpServers object', async () => {
    const { loadMcpConfig } = await import('../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    const { getConfig } = await import('../../config.mjs')
    
    const mcpConfig = {
      mcpServers: {}
    }
    
    vi.mocked(getConfig).mockResolvedValue({...baseConfig, ...mcpConfig})
    vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(mcpConfig))

    const result = await loadMcpConfig()
    expect(result).toEqual(mcpConfig)
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })
}) 