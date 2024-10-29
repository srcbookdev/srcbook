import Path from 'node:path';
import fs from 'node:fs/promises';
import { glob } from 'glob';
import { CommandHandle, CommandResult, Sandbox } from '@e2b/code-interpreter';
import { FileType } from '@srcbook/shared';

import { App } from '../db/schema.mjs';
import { pathToApp } from './disk.mjs';

const SANDBOX_APP_CWD = '/app';
const VITE_PORT_REGEX = /Local:.*http:\/\/localhost:([0-9]{1,4})/;

type SandboxWithMetadata =
  | {
      status: 'booting';
      sandbox: Sandbox;
      viteProcess: CommandHandle | null;
      npmInstallProcess: CommandHandle | null;
    }
  | {
      status: 'running';
      sandbox: Sandbox;
      viteProcess: CommandHandle;
      localPort: number;
      url: string;
      npmInstallProcess: CommandHandle | null;
    }
  | { status: 'stopping'; sandbox: Sandbox };

const sandboxes: Map<string, SandboxWithMetadata> = new Map();

export function getSandbox(appId: string): SandboxWithMetadata | null {
  return sandboxes.get(appId) ?? null;
}

export function updateSandbox(
  appId: string,
  literalOrUpdater: SandboxWithMetadata | ((old: SandboxWithMetadata) => SandboxWithMetadata),
) {
  const sandbox = sandboxes.get(appId);
  if (sandbox) {
    const newSandbox =
      typeof literalOrUpdater === 'function' ? literalOrUpdater(sandbox) : literalOrUpdater;
    sandboxes.set(appId, newSandbox);
  }
}

type CreateSandboxOptions = {
  onStdout?: (encodedData: string) => void;
  onStderr?: (encodedData: string) => void;
  onExit?: (code: number) => void;
  onRunning?: (url: string) => void;
};

export async function createSandbox(
  app: App,
  options?: CreateSandboxOptions,
): Promise<SandboxWithMetadata> {
  // 1. start it
  const sandboxWithMetadata: SandboxWithMetadata = {
    status: 'booting',
    sandbox: await Sandbox.create('eduzq2dmxgnpbzdwdbpc'), // (this id maps to a docker image)
    viteProcess: null,
    npmInstallProcess: null,
  };
  sandboxes.set(app.externalId, sandboxWithMetadata);

  // 2. copy all the files in
  const localCwd = pathToApp(app.externalId);
  await recursiveCopyIntoSandbox(localCwd, sandboxWithMetadata.sandbox, SANDBOX_APP_CWD);

  // 2.5. run npm install
  await runNpmInstallInSandbox(app.externalId);

  // 3. start vite
  const onChangePort = async (newPort: number) => {
    const url = `https://${sandboxWithMetadata.sandbox.getHost(newPort)}`;

    // NOTE: it takes a moment for the url to become active, in actuality there should maybe be a
    // loop here that makes a request to `url` on an exponential backoff to see if its live yet?
    await new Promise((r) => setTimeout(r, 500));

    updateSandbox(app.externalId, (old) => {
      if (old.status === 'stopping') {
        return old;
      }
      if (old.viteProcess === null) {
        return old;
      }

      return {
        status: 'running',
        sandbox: old.sandbox,
        viteProcess: old.viteProcess,
        localPort: newPort,
        url,
        npmInstallProcess: old.npmInstallProcess,
      };
    });

    if (options?.onRunning) {
      options.onRunning(url);
    }
  };

  const commandHandle = await sandboxWithMetadata.sandbox.commands.run(
    Path.join(SANDBOX_APP_CWD, 'node_modules', '.bin', 'vite'),
    {
      background: true,
      timeoutMs: 0, // (disables auto timeout behavior)
      cwd: SANDBOX_APP_CWD,
      onStdout(encodedData) {
        console.log(encodedData);

        if (options?.onStdout) {
          options.onStdout(encodedData);
        }

        const potentialPortMatch = VITE_PORT_REGEX.exec(encodedData);
        if (potentialPortMatch) {
          const portString = potentialPortMatch[1]!;
          const port = parseInt(portString, 10);
          onChangePort(port);
        }
      },
      onStderr(encodedData) {
        console.error(encodedData);

        if (options?.onStderr) {
          options.onStderr(encodedData);
        }
      },
    },
  );

  updateSandbox(app.externalId, (old) => {
    if (old.status === 'stopping') {
      return old;
    }
    return {
      ...sandboxWithMetadata,
      viteProcess: commandHandle,
    };
  });

  // 4. Wait for vite to complete
  commandHandle
    .wait()
    .then((result) => {
      console.error('e2b vite command completed! Deleting sandbox...', result);
      sandboxes.delete(app.externalId);

      if (options?.onExit) {
        options.onExit(result.exitCode);
      }
    })
    .catch((err) => {
      console.error('Error waiting for e2b vite command to complete:', err);
    });

  return sandboxWithMetadata;
}

export async function terminateSandbox(appId: string) {
  const sandboxWithMetadata = sandboxes.get(appId);
  if (!sandboxWithMetadata) {
    return;
  }
  if (sandboxWithMetadata.status !== 'running') {
    return;
  }

  updateSandbox(appId, (old) => {
    if (old.status !== 'running') {
      return old;
    }

    return {
      status: 'stopping',
      sandbox: old.sandbox,
    };
  });

  await sandboxWithMetadata.sandbox.kill();
  sandboxes.delete(appId);
}

type NpmInstallOptions = {
  onStdout?: (encodedData: string) => void;
  onStderr?: (encodedData: string) => void;
  onExit?: (code: number) => void;
};

export async function runNpmInstallInSandbox(
  appId: string,
  options?: NpmInstallOptions,
): Promise<CommandResult | null> {
  const sandboxWithMetadata = getSandbox(appId);
  if (!sandboxWithMetadata) {
    return null;
  }
  if (sandboxWithMetadata.status === 'stopping') {
    return null;
  }
  if (sandboxWithMetadata.npmInstallProcess !== null) {
    console.warn(
      `Warning: attempted to start a second npm insatll process in sandbox for app ${appId}!`,
    );
    return null;
  }

  const commandHandle = await sandboxWithMetadata.sandbox.commands.run(
    'npm install --include=dev',
    {
      background: true,
      cwd: SANDBOX_APP_CWD,
      onStdout(encodedData) {
        console.log(encodedData);

        if (options?.onStdout) {
          options.onStdout(encodedData);
        }
      },
      onStderr(encodedData) {
        console.error(encodedData);

        if (options?.onStderr) {
          options.onStderr(encodedData);
        }
      },
    },
  );
  updateSandbox(appId, (old) => {
    if (old.status !== 'running') {
      return old;
    }
    return {
      ...sandboxWithMetadata,
      npmInstallProcess: commandHandle,
    };
  });

  // 4. Wait for vite to complete
  commandHandle
    .wait()
    .then((result) => {
      console.error('e2b npm install completed!', result);
      updateSandbox(appId, (old) => {
        if (old.status !== 'running') {
          return old;
        }
        return {
          ...sandboxWithMetadata,
          npmInstallProcess: null,
        };
      });

      if (options?.onExit) {
        options.onExit(result.exitCode);
      }
    })
    .catch((err) => {
      console.error('Error waiting for e2b vite command to complete:', err);
    });

  return commandHandle.wait();
}

// NOTE: there's not a built in way to do this yet:
// https://e2b.dev/docs/quickstart/upload-download-files
async function recursiveCopyIntoSandbox(
  fromDirectory: string,
  sandbox: Sandbox,
  toDirectoryInSandbox: string,
) {
  const fileList = await glob(Path.join(fromDirectory, '**'), {
    ignore: Path.join(fromDirectory, 'node_modules', '**'),
  });
  for (const filePath of fileList) {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      continue;
    }

    const fileContents = await fs.readFile(filePath);
    const relativeFilePath = Path.relative(fromDirectory, filePath);
    const filePathInSandbox = Path.join(toDirectoryInSandbox, relativeFilePath);
    console.log('copying', filePath, '=>', filePathInSandbox);
    await sandbox.files.write(filePathInSandbox, fileContents);
  }
}

export async function writeFileToSandbox(app: App, file: FileType) {
  const sandbox = getSandbox(app.externalId);
  if (!sandbox) {
    return;
  }

  await sandbox.sandbox.files.write(Path.join(SANDBOX_APP_CWD, file.path), file.source);
  // NOTE: broadcastFileUpdated may be needed here?
}
