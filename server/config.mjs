import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const baseDir = process.env.BASE_DIR || path.join(os.homedir(), '.srcbook');

// Default configuration
const defaultConfig = {
  name: 'Super Cool User',
  baseDir,
};

async function loadConfig() {
  const configPath = path.join(baseDir, 'config.json');

  try {
    const configFile = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configFile);

    return { ...defaultConfig, ...config };
  } catch (error) {
    console.error('Configuration file not found, creating one...');
    fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    console.info('Configuration file created at', configPath);
    return defaultConfig;
  }
}

const config = await loadConfig();
export default config;
