import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import { AppType } from '@srcbook/shared';

import { loadApp, loadApps } from '@/clients/http/apps';
import Header from '@/components/apps/header';
import Sidebar from '@/components/apps/sidebar';
import { useEffect, useRef } from 'react';
import { AppChannel } from '@/clients/websocket';
import { FilesProvider } from '@/components/apps/use-files';
import { Editor } from '@/components/apps/workspace/editor';
import { Preview } from '@/components/apps/workspace/preview';

async function loader({ params }: LoaderFunctionArgs) {
  const [{ data: apps }, { data: app }] = await Promise.all([
    loadApps('desc'),
    loadApp(params.id!),
  ]);

  return { apps, app };
}

type AppLoaderDataType = {
  app: AppType;
  apps: AppType[];
};

export function AppsPage() {
  const { app, apps } = useLoaderData() as AppLoaderDataType;

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
  }, [app.id, channelRef.current]);

  return (
    <FilesProvider channel={channelRef.current}>
      <Apps app={app} apps={apps} />
    </FilesProvider>
  );
}

function Apps(props: { app: AppType; apps: AppType[] }) {
  return (
    <div className="h-screen max-h-screen flex flex-col">
      <Header app={props.app} apps={props.apps} className="h-12 max-h-12 shrink-0" />
      <div className="flex flex-1 min-w-0">
        <Sidebar />
        <div className="w-full h-full grid grid-cols-2 divide-x divide-border">
          <Editor />
          <Preview url="https://srcbook.com" />
        </div>
      </div>
    </div>
  );
}

AppsPage.loader = loader;
export default AppsPage;
