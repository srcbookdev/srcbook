import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const SRCBOOK_DIR = path.join(os.homedir(), '.srcbook');

const userDir = import.meta.env.VITE_NOTEBOOKS_DIR || os.homedir();
const configPath = path.join(SRCBOOK_DIR, 'config.json');
const secretsPath = path.join(SRCBOOK_DIR, 'secrets.json');

// This will hold any user settings and configuration.
// Right now the only settings is the base directory.
type ConfigObjectType = {
  baseDir: string;
};

type SecretsObjectType = Record<string, string>;

// Default configuration
const defaultConfig: ConfigObjectType = {
  baseDir: userDir,
};

let config = { ...defaultConfig }; // In-memory config object
let secrets = {} as SecretsObjectType; // In-memory secrets object

async function loadConfig() {
  try {
    const configFile = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configFile);

    return { ...defaultConfig, ...config };
  } catch (error) {
    console.warn('Configuration file not found, creating one at', configPath);
    fs.mkdir(SRCBOOK_DIR, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
}

async function loadSecrets() {
  try {
    const secretsFile = await fs.readFile(secretsPath, 'utf-8');
    return { ...secrets, ...JSON.parse(secretsFile) };
  } catch (error) {
    console.warn('Secrets file not found, creating one at ', secretsPath);
    fs.mkdir(SRCBOOK_DIR, { recursive: true });
    await fs.writeFile(secretsPath, JSON.stringify({}, null, 2));
    return {};
  }
}

export async function saveConfig(newConfig: ConfigObjectType) {
  fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
  config = { ...config, ...newConfig };
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
  secrets[key] = value;
  await fs.writeFile(secretsPath, JSON.stringify(secrets, null, 2));
}

export async function removeSecret(key: string) {
  delete secrets[key];
  await fs.writeFile(secretsPath, JSON.stringify(secrets, null, 2));
}

async function load() {
  await loadConfig();
  await loadSecrets();
}

export default await load();
