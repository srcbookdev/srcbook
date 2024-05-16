import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const configDir = process.env.SRC_BOOK_CONFIG_DIR || path.join(os.homedir(), '.srcbook');

// Default configuration
const defaultConfig = {
  name: 'Super Cool User',
  baseDir: configDir,
};

let config = { ...defaultConfig }; // In-memory config object

async function loadConfig() {
  const configPath = path.join(configDir, 'config.json');

  try {
    const configFile = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configFile);

    return { ...defaultConfig, ...config };
  } catch (error) {
    console.error('Configuration file not found, creating one...');
    fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    console.info('Configuration file created at', configPath);
    return defaultConfig;
  }
}

export async function saveConfig(newConfig) {
  const configPath = path.join(configDir, 'config.json');
  try {
    fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
    config = { ...config, ...newConfig };
  } catch (error) {
    console.error('Failed to save configuration file:', error);
  }
}

export async function getConfig() {
  if (Object.keys(config).length === 0) {
    await loadConfig();
  }
  return config;
}

await loadConfig();

export default config;
