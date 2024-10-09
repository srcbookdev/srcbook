import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import { AppType } from '@srcbook/shared';

import { loadApp } from '@/clients/http/apps';
import Sidebar from '@/components/apps/sidebar';
import { useEffect, useRef } from 'react';
import { AppChannel } from '@/clients/websocket';
import { FilesProvider } from '@/components/apps/use-files';
import { Editor } from '@/components/apps/workspace/editor/editor';
import { Preview } from '@/components/apps/workspace/preview';
import { PreviewProvider, usePreview } from '@/components/apps/use-preview';
import { cn } from '@/lib/utils';

async function loader({ params }: LoaderFunctionArgs) {
  const [{ data: app }] = await Promise.all([loadApp(params.id!)]);

  return { app };
}

type AppLoaderDataType = {
  app: AppType;
};

export function AppsPage() {
  const { app } = useLoaderData() as AppLoaderDataType;

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
    <FilesProvider channel={channelRef.current}>
      <PreviewProvider channel={channelRef.current}>
        <Apps app={app} />
      </PreviewProvider>
    </FilesProvider>
  );
}

function Apps(props: { app: AppType }) {
  const { status: previewStatus } = usePreview();

  return (
    <div className="h-screen max-h-screen flex">
      <Sidebar />
      <div
        className={cn(
          'w-full h-full grid divide-x divide-border',
          previewStatus === 'running' ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        <Editor app={props.app} />
        {previewStatus === 'running' && <Preview />}
      </div>
    </div>
  );
}

AppsPage.loader = loader;
export default AppsPage;
