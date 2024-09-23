import { ChildProcess } from 'node:child_process';

import {
  FilePayloadSchema,
  PreviewStartPayloadSchema,
  PreviewStopPayloadSchema,
  PreviewStatusPayloadSchema,
  FileUpdatedPayloadSchema,
  FileType,
} from '@srcbook/shared';

import WebSocketServer from '../ws-client.mjs';
import { loadApp } from '../../apps/app.mjs';
import { fileUpdated, getProjectFiles, pathToApp } from '../../apps/disk.mjs';
import { vite } from '../../exec.mjs';

const processes = new Map<string, ChildProcess>();

async function previewStart(wss: WebSocketServer) {
  const app = await loadApp('qpi9fpd8o600d26kies06smojg');

  if (!app) {
    return;
  }

  const existingProcess = processes.get(app.externalId);

  if (existingProcess) {
    wss.broadcast(`app:${app.externalId}`, 'preview:status', { url: null, status: 'running' });
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
      wss.broadcast(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
      });
    },
  });

  processes.set(app.externalId, process);

  // TODO: better way to know when the server is ready
  setTimeout(() => {
    wss.broadcast(`app:${app.externalId}`, 'preview:status', {
      url: 'http://localhost:5174/',
      status: 'running',
    });
  }, 500);
}

async function previewStop(wss: WebSocketServer) {
  const app = await loadApp('qpi9fpd8o600d26kies06smojg');

  if (!app) {
    return;
  }

  const process = processes.get(app.externalId);

  if (!process) {
    wss.broadcast(`app:${app.externalId}`, 'preview:status', { url: null, status: 'stopped' });
    return;
  }

  process.kill('SIGTERM');

  wss.broadcast(`app:${app.externalId}`, 'preview:status', { url: null, status: 'stopped' });
}

export function register(wss: WebSocketServer) {
  wss
    .channel('app:*')
    .incoming('preview:start', PreviewStartPayloadSchema, () => previewStart(wss))
    .incoming('preview:stop', PreviewStopPayloadSchema, () => previewStop(wss))
    .incoming('file:updated', FileUpdatedPayloadSchema, async (payload) => {
      const app = await loadApp('qpi9fpd8o600d26kies06smojg');
      const file = payload.file;
      console.log(app, file);
      fileUpdated(app!, file as FileType);
    })
    .outgoing('file', FilePayloadSchema)
    .outgoing('preview:status', PreviewStatusPayloadSchema)
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
