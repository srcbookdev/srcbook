import path from 'node:path';
import fs from 'node:fs/promises';
import {
  PreviewStartPayloadSchema,
  PreviewStopPayloadSchema,
  FileUpdatedPayloadSchema,
  FileType,
  FileUpdatedPayloadType,
  PreviewStartPayloadType,
  PreviewStopPayloadType,
  DepsInstallPayloadType,
  DepsInstallPayloadSchema,
  DepsClearPayloadType,
  DepsStatusPayloadSchema,
} from '@srcbook/shared';

import WebSocketServer, {
  type MessageContextType,
  type ConnectionContextType,
} from '../ws-client.mjs';
import { loadApp } from '../../apps/app.mjs';
import { fileUpdated, pathToApp } from '../../apps/disk.mjs';
import { directoryExists } from '../../fs-utils.mjs';
import {
  getAppProcess,
  setAppProcess,
  deleteAppProcess,
  npmInstall,
  viteServer,
} from '../../apps/processes.mjs';

const VITE_PORT_REGEX = /Local:.*http:\/\/localhost:([0-9]{1,4})/;

type AppContextType = MessageContextType<'appId'>;

async function previewStart(
  _payload: PreviewStartPayloadType,
  context: AppContextType,
  wss: WebSocketServer,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  const existingProcess = getAppProcess(app.externalId, 'vite:server');

  if (existingProcess) {
    wss.broadcast(`app:${app.externalId}`, 'preview:status', {
      status: 'running',
      url: `http://localhost:${existingProcess.port}/`,
    });
    return;
  }

  wss.broadcast(`app:${app.externalId}`, 'preview:status', {
    url: null,
    status: 'booting',
  });

  const onChangePort = (newPort: number) => {
    const process = getAppProcess(app.externalId, 'vite:server');

    // This is not expected to happen
    if (!process) {
      wss.broadcast(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
        code: null,
      });
      return;
    }

    setAppProcess(app.externalId, { ...process, port: newPort });

    wss.broadcast(`app:${app.externalId}`, 'preview:status', {
      url: `http://localhost:${newPort}/`,
      status: 'running',
    });
  };

  viteServer(app.externalId, {
    args: [],
    stdout: (data) => {
      const encodedData = data.toString('utf8');
      console.log(encodedData);

      wss.broadcast(`app:${app.externalId}`, 'preview:log', {
        log: {
          type: 'stdout',
          data: encodedData,
        },
      });

      const potentialPortMatch = VITE_PORT_REGEX.exec(encodedData);
      if (potentialPortMatch) {
        const portString = potentialPortMatch[1]!;
        const port = parseInt(portString, 10);
        onChangePort(port);
      }
    },
    stderr: (data) => {
      const encodedData = data.toString('utf8');
      console.error(encodedData);

      wss.broadcast(`app:${app.externalId}`, 'preview:log', {
        log: {
          type: 'stderr',
          data: encodedData,
        },
      });
    },
    onExit: (code) => {
      deleteAppProcess(app.externalId, 'vite:server');

      wss.broadcast(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
        code: code,
      });
    },
    onError: (error) => {
      // Errors happen when we try to run vite before node modules are installed.
      // Make sure we clean up the app process and inform the client.
      deleteAppProcess(app.externalId, 'vite:server');

      // TODO: Use a different event to communicate to the client there was an error.
      // If the error is ENOENT, for example, it means node_modules and/or vite is missing.
      wss.broadcast(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
        code: null,
      });
    },
  });
}

async function previewStop(
  _payload: PreviewStopPayloadType,
  context: AppContextType,
  conn: ConnectionContextType,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  const result = getAppProcess(app.externalId, 'vite:server');

  if (!result) {
    conn.reply(`app:${app.externalId}`, 'preview:status', {
      url: null,
      status: 'stopped',
      code: null,
    });
    return;
  }

  // Killing the process should result in its onExit handler being called.
  // The onExit handler will remove the process from the processMetadata map
  // and send the `preview:status` event with a value of 'stopped'
  result.process.kill('SIGTERM');
}

async function dependenciesInstall(
  payload: DepsInstallPayloadType,
  context: AppContextType,
  wss: WebSocketServer,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  npmInstall(app.externalId, {
    args: [],
    packages: payload.packages ?? undefined,
    stdout: (data) => {
      wss.broadcast(`app:${app.externalId}`, 'deps:install:log', {
        log: { type: 'stdout', data: data.toString('utf8') },
      });
    },
    stderr: (data) => {
      wss.broadcast(`app:${app.externalId}`, 'deps:install:log', {
        log: { type: 'stderr', data: data.toString('utf8') },
      });
    },
    onExit: (code) => {
      // We must clean up this process so that we can run npm install again
      deleteAppProcess(app.externalId, 'npm:install');

      wss.broadcast(`app:${app.externalId}`, 'deps:install:status', {
        status: code === 0 ? 'complete' : 'failed',
        code,
      });

      if (code === 0) {
        wss.broadcast(`app:${app.externalId}`, 'deps:status:response', {
          nodeModulesExists: true,
        });
      }
    },
  });
}

async function clearNodeModules(
  _payload: DepsClearPayloadType,
  context: AppContextType,
  conn: ConnectionContextType,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  const appPath = pathToApp(app.externalId);
  const nodeModulesPath = path.join(appPath, 'node_modules');
  await fs.rm(nodeModulesPath, { recursive: true, force: true });

  conn.reply(`app:${app.externalId}`, 'deps:status:response', {
    nodeModulesExists: false,
  });
}

async function dependenciesStatus(
  _payload: DepsClearPayloadType,
  context: AppContextType,
  conn: ConnectionContextType,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  const appPath = pathToApp(app.externalId);
  const nodeModulesPath = path.join(appPath, 'node_modules');
  conn.reply(`app:${app.externalId}`, 'deps:status:response', {
    nodeModulesExists: await directoryExists(nodeModulesPath),
  });
}

async function onFileUpdated(payload: FileUpdatedPayloadType, context: AppContextType) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  fileUpdated(app, payload.file as FileType);
}

export function register(wss: WebSocketServer) {
  wss
    .channel('app:<appId>')
    .on('preview:start', PreviewStartPayloadSchema, (payload, context) =>
      previewStart(payload, context, wss),
    )
    .on('preview:stop', PreviewStopPayloadSchema, previewStop)
    .on('deps:install', DepsInstallPayloadSchema, (payload, context) => {
      dependenciesInstall(payload, context, wss);
    })
    .on('deps:clear', DepsInstallPayloadSchema, clearNodeModules)
    .on('deps:status', DepsStatusPayloadSchema, dependenciesStatus)
    .on('file:updated', FileUpdatedPayloadSchema, onFileUpdated);
}
