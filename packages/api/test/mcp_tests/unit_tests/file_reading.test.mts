import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as path from 'path'
import { SRCBOOK_DIR } from '../../../constants.mjs'

describe('File Reading', () => {
  const defaultConfigPath = path.join(SRCBOOK_DIR, 'srcbook_mcp_config.json')
  
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('successfully reads valid config file', async () => {
    // Setup mocks for this test
    vi.mock('../../../config.mjs', () => ({
      getConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
      updateConfig: vi.fn()
    }))
    vi.mock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn(),
        writeFile: vi.fn()
      }
    }))

    const { loadMcpConfig } = await import('../../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    
    const validConfig = {
      mcpServers: {
        test: {
          host: 'http://localhost:3000'
        }
      }
    }
    
    vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(validConfig))

    const result = await loadMcpConfig()
    expect(result).toEqual(validConfig)
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles empty config file', async () => {
    // Setup mocks for this test
    vi.mock('../../../config.mjs', () => ({
      getConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
      updateConfig: vi.fn()
    }))
    vi.mock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn(),
        writeFile: vi.fn()
      }
    }))

    const { loadMcpConfig } = await import('../../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    
    // Mock an empty file
    vi.mocked(fsPromises.default.readFile).mockResolvedValue('')

    const result = await loadMcpConfig()
    expect(result.mcpServers).toEqual({})
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles permission denied', async () => {
    // Setup mocks for this test
    vi.mock('../../../config.mjs', () => ({
      getConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
      updateConfig: vi.fn()
    }))
    vi.mock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn(),
        writeFile: vi.fn()
      }
    }))

    const { loadMcpConfig } = await import('../../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    
    // Mock a permission denied error
    vi.mocked(fsPromises.default.readFile).mockRejectedValue(new Error('EACCES: permission denied'))

    const result = await loadMcpConfig()
    expect(result.mcpServers).toEqual({})
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles file encoding issues', async () => {
    // Setup mocks for this test
    vi.mock('../../../config.mjs', () => ({
      getConfig: vi.fn().mockResolvedValue({ mcpServers: {} }),
      updateConfig: vi.fn()
    }))
    vi.mock('node:fs/promises', () => ({
      default: {
        readFile: vi.fn(),
        writeFile: vi.fn()
      }
    }))

    const { loadMcpConfig } = await import('../../../mcp/config.mjs')
    const fsPromises = await import('node:fs/promises')
    
    // Mock invalid UTF-8 data
    vi.mocked(fsPromises.default.readFile).mockRejectedValue(new Error('Invalid UTF-8'))

    const result = await loadMcpConfig()
    expect(result.mcpServers).toEqual({})
    expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })
})
