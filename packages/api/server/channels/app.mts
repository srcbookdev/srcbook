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
import { fileUpdated, pathToApp } from '../../apps/disk.mjs';
import { vite } from '../../exec.mjs';

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
  conn: ConnectionContextType,
) {
  const app = await loadApp(context.params.appId);

  if (!app) {
    return;
  }

  const existingProcess = processMetadata.get(app.externalId);

  if (existingProcess) {
    conn.reply(`app:${app.externalId}`, 'preview:status', {
      status: 'running',
      url: `http://localhost:${existingProcess.port}/`,
    });
    return;
  }

  conn.reply(`app:${app.externalId}`, 'preview:status', {
    url: null,
    status: 'booting',
  });

  const onChangePort = (newPort: number) => {
    processMetadata.set(app.externalId, { process, port: newPort });
    conn.reply(`app:${app.externalId}`, 'preview:status', {
      url: `http://localhost:${newPort}/`,
      status: 'running',
    });
  };

  let bufferedLogs: Array<String> = [];

  const process = vite({
    args: [],
    cwd: pathToApp(app.externalId),
    stdout: (data) => {
      const encodedData = data.toString('utf8');
      console.log(encodedData);
      bufferedLogs.push(encodedData);

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
      bufferedLogs.push(encodedData);
    },
    onExit: (code) => {
      processMetadata.delete(app.externalId);

      conn.reply(`app:${app.externalId}`, 'preview:status', {
        url: null,
        status: 'stopped',
        ok: code === 0,
        contents: code !== 0 ? bufferedLogs.join('\n') : null,
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
    conn.reply(`app:${app.externalId}`, 'preview:status', { url: null, status: 'stopped', ok: true });
    return;
  }

  result.process.kill('SIGTERM');

  conn.reply(`app:${app.externalId}`, 'preview:status', { url: null, status: 'stopped', ok: true });
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

      const existingProcess = processMetadata.get(app.externalId);

      ws.send(
        JSON.stringify([
          topic,
          'preview:status',
          existingProcess
            ? { status: 'running', url: `http://localhost:${existingProcess.port}/` }
            : { url: null, status: 'stopped', ok: true },
        ]),
      );
    });
}
