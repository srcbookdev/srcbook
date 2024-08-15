import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_PATH = path.join(__dirname, '../');

export function pathTo(...paths) {
  return path.join(ROOT_PATH, ...paths);
}

export function getPackageJson() {
  const packageJson = fs.readFileSync(pathTo('package.json'), 'utf-8');
  return JSON.parse(packageJson);
}

export function isPortAvailable(host, port) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.once('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve(false); // Port is not in use
      } else {
        reject(err); // Some other error occurred
      }
    });

    client.once('connect', () => {
      client.end();
      resolve(true); // Port is in use
    });

    client.connect(port, host);
  });
}
