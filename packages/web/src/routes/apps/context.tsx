import { Outlet, useLoaderData } from 'react-router-dom';
import type { AppType, DirEntryType, FileType } from '@srcbook/shared';

import { FilesProvider } from '@/components/apps/use-files';
import { PreviewProvider } from '@/components/apps/use-preview';
import { LogsProvider } from '@/components/apps/use-logs';
import { PackageJsonProvider } from '@/components/apps/use-package-json';
import { AppProvider, useApp } from '@/components/apps/use-app';
import { VersionProvider } from '@/components/apps/use-version';

export function AppContext() {
  const { app } = useLoaderData() as { app: AppType };

  return (
    <AppProvider key={app.id} app={app}>
      <Outlet />
    </AppProvider>
  );
}

type AppLoaderDataType = {
  rootDirEntries: DirEntryType;
  initialOpenedFile: FileType | null;
};

export function AppProviders(props: { children: React.ReactNode }) {
  const { initialOpenedFile, rootDirEntries } = useLoaderData() as AppLoaderDataType;

  const { channel } = useApp();

  return (
    <FilesProvider
      channel={channel}
      rootDirEntries={rootDirEntries}
      initialOpenedFile={initialOpenedFile}
    >
      <LogsProvider channel={channel}>
        <VersionProvider>
          <PackageJsonProvider channel={channel}>
            <PreviewProvider channel={channel}>{props.children}</PreviewProvider>
          </PackageJsonProvider>
        </VersionProvider>
      </LogsProvider>
    </FilesProvider>
  );
}
