import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { AppType, DirEntryType } from '@srcbook/shared';

import { loadApp, loadDirectory } from '@/clients/http/apps';
import Sidebar, { PanelType } from '@/components/apps/sidebar';
import { useEffect, useRef, useState } from 'react';
import Statusbar from '@/components/apps/statusbar';
import { AppChannel } from '@/clients/websocket';
import { FilesProvider, useFiles } from '@/components/apps/use-files';
import { Editor } from '@/components/apps/workspace/editor';
import { PreviewProvider } from '@/components/apps/use-preview';
import { LogsProvider } from '@/components/apps/use-logs';
import { PackageJsonProvider } from '@/components/apps/use-package-json';
import { ChatPanel } from '@/components/chat';
import DiffModal from '@/components/apps/diff-modal';
import { FileDiffType } from '@srcbook/shared';
import EditorHeader, { EditorHeaderTab } from '../components/apps/header';
import { AppProvider } from '@/components/apps/use-app';

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
    <AppProvider key={app.id} app={app}>
      <FilesProvider channel={channelRef.current} rootDirEntries={rootDirEntries}>
        <LogsProvider channel={channelRef.current}>
          <PackageJsonProvider channel={channelRef.current}>
            <PreviewProvider channel={channelRef.current}>
              <Apps />
            </PreviewProvider>
          </PackageJsonProvider>
        </LogsProvider>
      </FilesProvider>
    </AppProvider>
  );
}

function Apps() {
  const [tab, setTab] = useState<EditorHeaderTab>('code');

  const { openedFile } = useFiles();
  const [panel, setPanel] = useState<PanelType | null>(openedFile === null ? 'explorer' : null);

  const [diffModalProps, triggerDiffModal] = useState<{
    files: FileDiffType[];
    onUndoAll: () => void;
  } | null>(null);

  return (
    <>
      {diffModalProps && <DiffModal {...diffModalProps} onClose={() => triggerDiffModal(null)} />}
      <EditorHeader
        tab={tab}
        onChangeTab={setTab}
        className="shrink-0 h-12 max-h-12"
        onShowPackagesPanel={() => setPanel("settings")}
      />
      <div className="h-[calc(100vh-3rem)] flex">
        <Sidebar panel={panel} onChangePanel={setPanel} />
        <div className="grow shrink h-full flex flex-col w-0">
          <Editor tab={tab} onChangeTab={setTab} />
          <Statusbar />
        </div>
        <ChatPanel triggerDiffModal={triggerDiffModal} />
      </div>
    </>
  );
}

AppsPage.loader = loader;
export default AppsPage;
