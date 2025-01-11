import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as path from 'path'
import { SRCBOOK_DIR } from '../../constants.mjs'

describe('Config File Handling', () => {
  describe('Config Location', () => {
    const defaultConfigPath = path.join(SRCBOOK_DIR, 'srcbook_mcp_config.json')
    
    beforeEach(() => {
      vi.resetModules()
      vi.clearAllMocks()
    })

    test('finds config in default location', async () => {
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

      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      
      const minimalConfig = {
        mcpServers: {
          test: {
            host: 'http://localhost:3000'
          }
        }
      }
      
      vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(minimalConfig))

      const result = await loadMcpConfig()
      expect(result).toEqual(minimalConfig)
      expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
    })

    test('falls back to database when config does not exist', async () => {
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

      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      
      vi.mocked(fsPromises.default.readFile).mockRejectedValue(new Error('ENOENT'))

      const result = await loadMcpConfig()
      expect(result.mcpServers).toEqual({})
      expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
    })

    test('handles inaccessible config directory', async () => {
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

      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      
      vi.mocked(fsPromises.default.readFile).mockRejectedValue(new Error('EACCES'))

      const result = await loadMcpConfig()
      expect(result.mcpServers).toEqual({})
      expect(fsPromises.default.readFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
    })

    test('respects container-based config path', async () => {
      // Set container env BEFORE importing modules
      process.env.CONTAINER = 'true'

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

      const { loadMcpConfig } = await import('../../mcp/config.mjs')
      const fsPromises = await import('node:fs/promises')
      
      const containerConfig = {
        mcpServers: {
          test: {
            host: 'http://container-host:3000'
          }
        }
      }
      
      // Simpler mock that always returns the container config
      vi.mocked(fsPromises.default.readFile).mockResolvedValue(JSON.stringify(containerConfig))

      const result = await loadMcpConfig()
      expect(result).toEqual(containerConfig)
      // Verify we're using the container path
      expect(fsPromises.default.readFile).toHaveBeenCalledWith('/app/srcbook_mcp_config.json', 'utf-8')

      // Cleanup
      process.env.CONTAINER = undefined
    })
  })
})

