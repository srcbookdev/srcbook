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
  npmInstall,
} from '../../apps/processes.mjs';
import { createSandbox, getSandbox, terminateSandbox } from "../../apps/e2b.mjs";

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

  const existingSandbox = getSandbox(app.externalId);
  console.log('EXISTING', existingSandbox);
  if (existingSandbox) {
    wss.broadcast(`app:${app.externalId}`, 'preview:status', {
      status: existingSandbox.status,
      url: existingSandbox.status === "running" ? existingSandbox.url : null,
    });
    return;
  }

  wss.broadcast(`app:${app.externalId}`, 'preview:status', {
    url: null,
    status: 'booting',
  });

  await createSandbox(app, {
    onStdout: (encodedData: string) => {
      wss.broadcast(`app:${app.externalId}`, 'preview:log', {
        log: {
          type: 'stdout',
          data: encodedData,
        },
      });
    },
    onStderr: (encodedData: string) => {
      wss.broadcast(`app:${app.externalId}`, 'preview:log', {
        log: {
          type: 'stderr',
          data: encodedData,
        },
      });
    },
    onExit: (code: number) => {
      wss.broadcast(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
        code: code,
      });
    },
    onRunning: (url: string) => {
      console.log('RUNNING:', url)

      wss.broadcast(`app:${app.externalId}`, 'preview:status', {
        status: 'running',
        url,
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

  const sandboxWithMetadata = getSandbox(app.externalId);

  if (!sandboxWithMetadata) {
    conn.reply(`app:${app.externalId}`, 'preview:status', {
      url: null,
      status: 'stopped',
      code: null,
    });
    return;
  }

  // // Killing the process should result in its onExit handler being called.
  // // The onExit handler will remove the process from the processMetadata map
  // // and send the `preview:status` event with a value of 'stopped'
  // result.process.kill('SIGTERM');
  console.log('TERMINATE!', app.externalId);

  await terminateSandbox(app.externalId);
  conn.reply(`app:${app.externalId}`, 'preview:status', {
    url: null,
    status: 'stopped',
    code: null,
  });
}

async function dependenciesInstall(payload: DepsInstallPayloadType, context: AppContextType) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  npmInstall(app.externalId, {
    packages: payload.packages ?? undefined,
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
    .on('deps:install', DepsInstallPayloadSchema, dependenciesInstall)
    .on('deps:clear', DepsInstallPayloadSchema, clearNodeModules)
    .on('deps:status', DepsStatusPayloadSchema, dependenciesStatus)
    .on('file:updated', FileUpdatedPayloadSchema, onFileUpdated)
    .onJoin((_payload, context, conn) => {
      const appExternalId = (context as AppContextType).params.appId;

      // When connecting, send back info about an in flight npm install if one exists
      const npmInstallProcess = getAppProcess(appExternalId, 'npm:install');
      if (npmInstallProcess) {
        conn.reply(`app:${appExternalId}`, 'deps:install:status', { status: 'installing' });
      }
    });
}
