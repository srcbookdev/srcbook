import { ChildProcess } from 'node:child_process';

import {
  PreviewStartPayloadSchema,
  PreviewStopPayloadSchema,
  FileUpdatedPayloadSchema,
  FileType,
  FileUpdatedPayloadType,
  PreviewStartPayloadType,
  PreviewStopPayloadType,
} from '@srcbook/shared';

import WebSocketServer, {
  type MessageContextType,
  type ConnectionContextType,
} from '../ws-client.mjs';
import { loadApp } from '../../apps/app.mjs';
import { fileUpdated, getProjectFiles, pathToApp } from '../../apps/disk.mjs';
import { vite } from '../../exec.mjs';

type AppContextType = MessageContextType<'appId'>;

const processes = new Map<string, ChildProcess>();

async function previewStart(
  _payload: PreviewStartPayloadType,
  context: AppContextType,
  conn: ConnectionContextType,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  const existingProcess = processes.get(app.externalId);

  if (existingProcess) {
    conn.reply(`app:${app.externalId}`, 'preview:status', { url: null, status: 'running' });
    return;
  }

  const process = vite({
    // TODO: Configure port and fail if port in use
    args: [],
    cwd: pathToApp(app.externalId),
    stdout: (data) => {
      console.log(data.toString('utf8'));
    },
    stderr: (data) => {
      console.error(data.toString('utf8'));
    },
    onExit: (_code) => {
      processes.delete(app.externalId);
      conn.reply(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
      });
    },
  });

  processes.set(app.externalId, process);

  // TODO: better way to know when the server is ready
  setTimeout(() => {
    conn.reply(`app:${app.externalId}`, 'preview:status', {
      url: 'http://localhost:5174/',
      status: 'running',
    });
  }, 500);
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

  const process = processes.get(app.externalId);

  if (!process) {
    conn.reply(`app:${app.externalId}`, 'preview:status', { url: null, status: 'stopped' });
    return;
  }

  process.kill('SIGTERM');

  conn.reply(`app:${app.externalId}`, 'preview:status', { url: null, status: 'stopped' });
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
    .on('preview:start', PreviewStartPayloadSchema, previewStart)
    .on('preview:stop', PreviewStopPayloadSchema, previewStop)
    .on('file:updated', FileUpdatedPayloadSchema, onFileUpdated)
    .onJoin(async (topic, ws) => {
      const app = await loadApp(topic.split(':')[1]!);

      // TODO: disconnect
      if (!app) {
        return;
      }

      const existingProcess = processes.get(app.externalId);

      ws.send(
        JSON.stringify([
          topic,
          'preview:status',
          { url: null, status: existingProcess ? 'running' : 'stopped' },
        ]),
      );

      for (const file of await getProjectFiles(app)) {
        ws.send(JSON.stringify([topic, 'file', { file }]));
      }
    });
}
