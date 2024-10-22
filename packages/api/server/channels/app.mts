import path from 'node:path';
import fs from 'node:fs/promises';
import { ChildProcess } from 'node:child_process';

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
import { installAppDependencies, loadApp } from '../../apps/app.mjs';
import { fileUpdated, pathToApp } from '../../apps/disk.mjs';
import { vite } from '../../exec.mjs';
import { directoryExists } from '../../fs-utils.mjs';

const VITE_PORT_REGEX = /Local:.*http:\/\/localhost:([0-9]{1,4})/;

type AppContextType = MessageContextType<'appId'>;

type ProcessMetadata = {
  process: ChildProcess;
  port: number | null;
};

const processMetadata = new Map<string, ProcessMetadata>();

async function previewStart(
  _payload: PreviewStartPayloadType,
  context: AppContextType,
  wss: WebSocketServer,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  const existingProcess = processMetadata.get(app.externalId);

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
    processMetadata.set(app.externalId, { process, port: newPort });
    wss.broadcast(`app:${app.externalId}`, 'preview:status', {
      url: `http://localhost:${newPort}/`,
      status: 'running',
    });
  };

  const process = vite({
    args: [],
    cwd: pathToApp(app.externalId),
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
      processMetadata.delete(app.externalId);

      wss.broadcast(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
        code: code,
      });
    },
  });

  processMetadata.set(app.externalId, { process, port: null });
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

  const result = processMetadata.get(app.externalId);

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
  conn: ConnectionContextType,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  installAppDependencies(app, payload.packages);
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
    .on('deps:install', DepsInstallPayloadSchema, dependenciesInstall)
    .on('deps:clear', DepsInstallPayloadSchema, clearNodeModules)
    .on('deps:status', DepsStatusPayloadSchema, dependenciesStatus)
    .on('file:updated', FileUpdatedPayloadSchema, onFileUpdated);
}
