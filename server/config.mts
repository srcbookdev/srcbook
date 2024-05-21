import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const configDir = process.env.SRC_BOOK_CONFIG_DIR || path.join(os.homedir(), '.srcbook');

type ConfigObjectType = {
  baseDir: string;
};

type SecretsObjectType = Record<string, string>;

// Default configuration
const defaultConfig: ConfigObjectType = {
  baseDir: configDir,
};

let config = { ...defaultConfig }; // In-memory config object
let secrets = {} as SecretsObjectType; // In-memory secrets object

async function loadConfig() {
  const configPath = path.join(configDir, 'config.json');

  try {
    const configFile = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configFile);

    return { ...defaultConfig, ...config };
  } catch (error) {
    console.warn('Configuration file not found, creating one...');
    fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    console.info('Configuration file created at', configPath);
    return defaultConfig;
  }
}

async function loadSecrets() {
  const secretsPath = path.join(configDir, 'secrets.json');
  try {
    const secretsFile = await fs.readFile(secretsPath, 'utf-8');
    return { ...secrets, ...JSON.parse(secretsFile) };
  } catch (error) {
    console.warn('Secrets file not found, creating one...');
    fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(secretsPath, JSON.stringify({}, null, 2));
    console.info('Secrets file created at', secretsPath);
    return {};
  }
}

export async function saveConfig(newConfig: ConfigObjectType) {
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
    config = await loadConfig();
  }
  return config;
}

export async function getSecrets() {
  if (Object.keys(secrets).length === 0) {
    secrets = await loadSecrets();
  }
  return secrets;
}

export async function addSecret(key: string, value: string) {
  try {
    secrets[key] = value;
    await fs.writeFile(path.join(configDir, 'secrets.json'), JSON.stringify(secrets, null, 2));
  } catch (error) {
    console.error('Failed to save secrets file:', error);
  }
}

export async function removeSecret(key: string) {
  try {
    await fs.writeFile(path.join(configDir, 'secrets.json'), JSON.stringify(secrets, null, 2));
    delete secrets[key];
  } catch (error) {
    console.error('Failed to save secrets file:', error);
  }
}

async function load() {
  await loadConfig();
  await loadSecrets();
}

export default await load();
