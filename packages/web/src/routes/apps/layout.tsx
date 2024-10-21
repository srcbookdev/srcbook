import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { type PanelType } from '@/components/apps/sidebar';
import BottomDrawer from '@/components/apps/bottom-drawer';
import { ChatPanel } from '@/components/chat';
import DiffModal from '@/components/apps/diff-modal';
import { FileDiffType } from '@srcbook/shared';
import Header, { type HeaderTab } from '@/components/apps/header';
import { useApp } from '@/components/apps/use-app';
import PackageInstallToast from '@/components/apps/package-install-toast';
import { usePackageJson } from '@/components/apps/use-package-json';
import InstallPackageModal from '@/components/install-package-modal';
import { useHotkeys } from 'react-hotkeys-hook';

export default function AppLayout(props: {
  activeTab: HeaderTab;
  activePanel: PanelType | null;
  children: React.ReactNode;
}) {
  const navigateTo = useNavigate();
  const { app } = useApp();

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
      <Header
        tab={props.activeTab}
        onChangeTab={(tab) => {
          if (tab === 'preview') {
            navigateTo(`/apps/${app.id}`);
          } else {
            navigateTo(`/apps/${app.id}/files`);
          }
        }}
        className="shrink-0 h-12 max-h-12"
      />
      <div className="h-[calc(100vh-3rem)] flex">
        <Sidebar initialPanel={props.activePanel} />
        <div className="grow shrink flex flex-col w-0">
          <div className="relative grow shrink flex flex-col w-full overflow-hidden">
            <PackageInstallToast />
            <div className="w-full flex-1 overflow-auto">{props.children}</div>
          </div>
          <BottomDrawer />
        </div>
        <ChatPanel triggerDiffModal={triggerDiffModal} />
      </div>
    </>
  );
}
