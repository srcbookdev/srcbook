import { spawn } from 'node:child_process';
import { Command } from 'commander';
import { pathTo, getPackageJson, isPortAvailable } from './utils.mjs';
import open from 'open';

function openInBrowser(url) {
  open(url).then(
    () => {},
    () => {},
  );
}

function startServer(port, callback) {
  const server = spawn('node', [pathTo('src', 'server.mjs')], {
    // Inherit stdio configurations from CLI (parent) process and allow IPC
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: port,
    },
  });

  // Exit the CLI (parent) process when the server (child) process closes
  server.on('close', (code) => {
    process.exit(code);
  });

  // Listen to messages sent from the server (child) process
  server.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'init') {
      callback();
    }
  });

  // Kill the server (child) process when the CLI (parent) process terminates from an exception
  process.on('uncaughtException', (error) => {
    console.error(error);
    server.kill();
  });
}

export default function program() {
  const { name, description, version } = getPackageJson();

  const program = new Command();

  program.name(name).description(description).version(version);

  program
    .command('start')
    .description('Start the Srcbook server')
    .option('-p, --port <port>', 'Port to run the server on', '2150')
    .action(({ port }) => {
      startServer(port, () => {
        openInBrowser(`http://localhost:${port}`);
      });
    });

  program
    .command('import')
    .description('Import a Srcbook')
    .option('-p, --port <port>', 'Port of the server', '2150')
    .argument('<specifier>', 'An identifier of a Srcbook on hub.srcbook.com')
    .action(async (specifier, { port }) => {
      const portAvailable = await isPortAvailable('localhost', port);

      if (portAvailable) {
        return doImport(specifier, port);
      }

      startServer(port, () => {
        doImport(specifier, port);
      });
    });

  program.parse();
}

async function doImport(specifier, port) {
  const filepath = specifier.endsWith('.src.md') ? specifier : `${specifier}.src.md`;
  const srcbookUrl = `https://hub.srcbook.com/srcbooks/${filepath}`;

  const res = await fetch(srcbookUrl);

  if (!res.ok || res.status !== 200) {
    console.error(`Srcbook not found ${specifier}`);
    process.exit(1);
  }

  const srcmd = await res.text();

  const sessionId = await importSrcbook(srcmd, port, srcbookUrl);

  openInBrowser(`http://localhost:${port}/srcbooks/${sessionId}`);
}

async function importSrcbook(srcmd, port, srcbookUrl) {
  const importResponse = await fetch(`http://localhost:${port}/api/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: srcmd }),
  });

  if (!importResponse.ok || importResponse.status !== 200) {
    console.error(`Cannot import ${srcbookUrl}`);
    process.exit(1);
  }

  const importResponseBody = await importResponse.json();

  const sessionsResponse = await fetch(`http://localhost:${port}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: importResponseBody.result.dir }),
  });

  if (!sessionsResponse.ok || sessionsResponse.status !== 200) {
    console.error(`Failed to open ${srcbookUrl}`);
    process.exit(1);
  }

  const sessionsResponseBody = await sessionsResponse.json();

  return sessionsResponseBody.result.id;
}
