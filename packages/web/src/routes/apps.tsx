import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { AppType, DirEntryType } from '@srcbook/shared';

import { loadApp, loadDirectory } from '@/clients/http/apps';
import Sidebar from '@/components/apps/sidebar';
import { useEffect, useRef } from 'react';
import { AppChannel } from '@/clients/websocket';
import { FilesProvider } from '@/components/apps/use-files';
import { Editor } from '@/components/apps/workspace/editor/editor';
import { Preview } from '@/components/apps/workspace/preview';
import { PreviewProvider, usePreview } from '@/components/apps/use-preview';
import { cn } from '@/lib/utils';
import { ChatPanel } from '@/components/chat';

async function loader({ params }: LoaderFunctionArgs) {
  const [{ data: app }, { data: rootDirEntries }] = await Promise.all([
    loadApp(params.id!),
    loadDirectory(params.id!, '.'),
  ]);

  return { app, rootDirEntries };
}

type AppLoaderDataType = {
  app: AppType;
  rootDirEntries: DirEntryType;
};

export function AppsPage() {
  const { app, rootDirEntries } = useLoaderData() as AppLoaderDataType;

  const channelRef = useRef(AppChannel.create(app.id));

  // This is only meant to be run one time, when the component mounts.
  useEffect(() => {
    channelRef.current.subscribe();
    return () => channelRef.current.unsubscribe();
  }, []);

  useEffect(() => {
    if (app.id === channelRef.current.appId) {
      return;
    }

    channelRef.current.unsubscribe();
    channelRef.current = AppChannel.create(app.id);
  }, [app.id]);

  return (
    <FilesProvider
      // Key can be used to remount a fresh provider if the app changes.
      // This ensures we get a clean set of state for the new app.
      key={app.id}
      app={app}
      channel={channelRef.current}
      rootDirEntries={rootDirEntries}
    >
      <PreviewProvider channel={channelRef.current}>
        <Apps app={app} />
      </PreviewProvider>
    </FilesProvider>
  );
}

function Apps(props: { app: AppType }) {
  const { status: previewStatus } = usePreview();
  const previewVisible = previewStatus === 'booting' || previewStatus === 'running';

  return (
    <div className="h-screen max-h-screen flex">
      <Sidebar />
      <div
        className={cn(
          'w-full h-full grid divide-x divide-border',
          previewVisible ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        <Editor app={props.app} />
        {previewVisible ? <Preview /> : null}
      </div>
      <ChatPanel app={props.app} />
    </div>
  );
}

AppsPage.loader = loader;
export default AppsPage;
