import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { AppType, DirEntryType } from '@srcbook/shared';

import { loadApp, loadDirectory } from '@/clients/http/apps';
import Sidebar from '@/components/apps/sidebar';
import { useEffect, useRef, useState } from 'react';
import { AppChannel } from '@/clients/websocket';
import { FilesProvider } from '@/components/apps/use-files';
import { Editor } from '@/components/apps/workspace/editor/editor';
import { PreviewProvider } from '@/components/apps/use-preview';
import { ChatPanel } from '@/components/chat';
import DiffModal from '@/components/apps/diff-modal';
import { FileDiffType } from '@/components/apps/types';
import EditorHeader, { EditorHeaderTab } from '../components/apps/workspace/editor/header';

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
  const [tab, setTab] = useState<EditorHeaderTab>('code');
  const [diffModalProps, triggerDiffModal] = useState<{
    files: FileDiffType[];
    onUndoAll: () => void;
  } | null>(null);

  return (
    <>
      {diffModalProps && <DiffModal {...diffModalProps} onClose={() => triggerDiffModal(null)} />}
      <EditorHeader
        app={props.app}
        tab={tab}
        onChangeTab={setTab}
        className="shrink-0 h-12 max-h-12"
      />
      <div className="h-[calc(100vh-3rem)] flex">
        <Sidebar />
        <div className="w-full h-full">
          <Editor tab={tab} />
        </div>
        <ChatPanel app={props.app} triggerDiffModal={triggerDiffModal} />
      </div>
    </>
  );
}

AppsPage.loader = loader;
export default AppsPage;
