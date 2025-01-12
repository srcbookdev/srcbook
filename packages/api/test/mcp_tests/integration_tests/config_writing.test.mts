// import { describe, test, expect, beforeEach, vi } from 'vitest'
// // Setup mocks at top level
// vi.mock('../../../constants.mjs', () => ({
//   SRCBOOK_DIR: '/test/path',
//   DIST_DIR: '/test/dist',
//   HOME_DIR: '/test/home',
//   SRCBOOKS_DIR: '/test/srcbooks'
// }))

// vi.mock('../../../config.mjs', () => ({
//   getConfig: vi.fn(),
//   updateConfig: vi.fn().mockResolvedValue(undefined)
// }))

// vi.mock('node:fs', () => ({
//   default: {
//     mkdirSync: vi.fn()
//   }
// }))

// vi.mock('node:fs/promises', () => ({
//   default: {
//     readFile: vi.fn(),
//     writeFile: vi.fn().mockResolvedValue(undefined),
//     mkdir: vi.fn().mockResolvedValue(undefined)
//   }
// }))

// vi.mock('../../../db/index.mjs', () => ({
//   db: {
//     select: vi.fn().mockReturnValue({
//       from: vi.fn().mockReturnValue({
//         limit: vi.fn().mockResolvedValue([])
//       })
//     }),
//     insert: vi.fn().mockReturnValue({
//       values: vi.fn().mockReturnValue({
//         returning: vi.fn().mockResolvedValue([])
//       })
//     }),
//     update: vi.fn().mockReturnValue({
//       set: vi.fn().mockReturnValue({
//         returning: vi.fn().mockResolvedValue([])
//       })
//     })
//   },
//   configs: {}
// }))

// describe('Config Writing', () => {
//   const defaultConfigPath = '/test/path/srcbook_mcp_config.json'
  
//   beforeEach(() => {
//     vi.resetModules()
//     vi.clearAllMocks()
//   })

//   test('writes config to file after database load', async () => {
//     const { updateMcpConfig } = await import('../../../mcp/config.mjs')
//     const fsPromises = await import('node:fs/promises')
//     const { updateConfig } = await import('../../../config.mjs')
    
//     const validConfig = {
//       mcpServers: {
//         'test-server': {
//           host: 'http://localhost:3000',
//           tools: ['test-tool']
//         }
//       }
//     }

//     await updateMcpConfig(validConfig)

//     expect(fsPromises.default.writeFile).toHaveBeenCalledWith(
//       defaultConfigPath,
//       JSON.stringify(validConfig, null, 2)
//     )
//     expect(updateConfig).toHaveBeenCalledWith({ mcpServers: validConfig.mcpServers })
//   })

//   test('writes config with correct formatting', async () => {
//     const { updateMcpConfig } = await import('../../../mcp/config.mjs')
//     const fsPromises = await import('node:fs/promises')
    
//     const configWithSpaces = {
//       mcpServers: {
//         'test-server': {
//           host: 'http://localhost:3000',
//           tools: [
//             'tool1',
//             'tool2'
//           ]
//         }
//       }
//     }

//     await updateMcpConfig(configWithSpaces)

//     // Verify proper formatting with 2-space indentation
//     expect(fsPromises.default.writeFile).toHaveBeenCalledWith(
//       defaultConfigPath,
//       JSON.stringify(configWithSpaces, null, 2)
//     )
//   })

//   test('handles write permission errors', async () => {
//     const { updateMcpConfig } = await import('../../../mcp/config.mjs')
//     const fsPromises = await import('node:fs/promises')
    
//     const config = {
//       mcpServers: {
//         'test-server': {
//           host: 'http://localhost:3000'
//         }
//       }
//     }

//     vi.mocked(fsPromises.default.writeFile).mockRejectedValueOnce(
//       Object.assign(new Error('permission denied'), { code: 'EACCES' })
//     )
    
//     await expect(updateMcpConfig(config)).rejects.toThrow()
    
//     expect(fsPromises.default.writeFile).toHaveBeenCalledWith(
//       defaultConfigPath,
//       JSON.stringify(config, null, 2)
//     )
//   })

//   test('syncs with database after successful write', async () => {
//     const { updateMcpConfig } = await import('../../../mcp/config.mjs')
//     const { updateConfig } = await import('../../../config.mjs')
    
//     const config = {
//       mcpServers: {
//         'test-server': {
//           host: 'http://localhost:3000'
//         }
//       }
//     }

//     await updateMcpConfig(config)

//     expect(updateConfig).toHaveBeenCalledWith({ mcpServers: config.mcpServers })
//   })

//   test('handles empty config gracefully', async () => {
//     const { updateMcpConfig } = await import('../../../mcp/config.mjs')
//     const fsPromises = await import('node:fs/promises')
    
//     const emptyConfig = {
//       mcpServers: {}
//     }

//     await updateMcpConfig(emptyConfig)

//     expect(fsPromises.default.writeFile).toHaveBeenCalledWith(
//       defaultConfigPath,
//       JSON.stringify(emptyConfig, null, 2)
//     )
//   })
// }) 