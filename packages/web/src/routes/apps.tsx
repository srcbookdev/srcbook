import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { AppType, DirEntryType } from '@srcbook/shared';

import { loadApp, loadDirectory } from '@/clients/http/apps';
import Sidebar, { PanelType } from '@/components/apps/sidebar';
import { useEffect, useRef, useState } from 'react';
import BottomDrawer from '@/components/apps/bottom-drawer';
import { AppChannel } from '@/clients/websocket';
import { FilesProvider, useFiles } from '@/components/apps/use-files';
import { Editor } from '@/components/apps/workspace/editor';
import { PreviewProvider } from '@/components/apps/use-preview';
import { LogsProvider } from '@/components/apps/use-logs';
import { PackageJsonProvider, usePackageJson } from '@/components/apps/use-package-json';
import { ChatPanel } from '@/components/chat';
import DiffModal from '@/components/apps/diff-modal';
import { FileDiffType } from '@srcbook/shared';
import EditorHeader, { EditorHeaderTab } from '@/components/apps/header';
import { AppProvider } from '@/components/apps/use-app';
import InstallPackageModal from '@/components/install-package-modal';
import { useHotkeys } from 'react-hotkeys-hook';

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
  const { installing, npmInstall, output, showInstallModal, setShowInstallModal } =
    usePackageJson();

  const [diffModalProps, triggerDiffModal] = useState<{
    files: FileDiffType[];
    onUndoAll: () => void;
  } | null>(null);

  useHotkeys('mod+i', () => {
    setShowInstallModal(true);
  });

  return (
    <>
      {diffModalProps && <DiffModal {...diffModalProps} onClose={() => triggerDiffModal(null)} />}
      <InstallPackageModal
        open={showInstallModal}
        setOpen={setShowInstallModal}
        installing={installing}
        npmInstall={npmInstall}
        output={output}
      />

      <EditorHeader
        tab={tab}
        onChangeTab={setTab}
        className="shrink-0 h-12 max-h-12"
        onShowPackagesPanel={() => setPanel('packages')}
      />
      <div className="h-[calc(100vh-3rem)] flex">
        <Sidebar panel={panel} onChangePanel={setPanel} />
        <div className="grow shrink flex flex-col w-0">
          <Editor tab={tab} onChangeTab={setTab} onShowPackagesPanel={() => setPanel('packages')} />
          <BottomDrawer />
        </div>
        <ChatPanel triggerDiffModal={triggerDiffModal} />
      </div>
    </>
  );
}

AppsPage.loader = loader;
export default AppsPage;
