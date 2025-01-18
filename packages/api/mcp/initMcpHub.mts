import mcpHub from './mcphub.mjs';

(async () => {
  try {
    await mcpHub.initialize();
    console.log('MCPHub initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize MCPHub:', error);
  }
})();