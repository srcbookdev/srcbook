import fs from 'node:fs';
import net from 'node:net';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const ROOT_PATH = Path.join(__dirname, '../../');

export function pathTo(...paths: string[]) {
  return Path.join(ROOT_PATH, ...paths);
}

export function getPackageJson() {
  const packageJson = fs.readFileSync(pathTo('package.json'), 'utf-8');
  return JSON.parse(packageJson);
}

export function isPortAvailable(host: string, port: number) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.once('error', (err) => {
      // @ts-ignore
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

    client.connect(port, host, () => {});
  });
}
