import { useFiles } from '../use-files';
import { EditorHeaderTab } from '../header';
import { useEffect } from 'react';
import { Preview } from './preview';
import { cn } from '@/lib/utils.ts';
import { CodeEditor } from '../editor';
import PackageInstallToast from '../package-install-toast';

type EditorProps = {
  tab: EditorHeaderTab;
  onChangeTab: (newTab: EditorHeaderTab) => void;
  onShowPackagesPanel: () => void;
};

export function Editor({ tab, onChangeTab, onShowPackagesPanel }: EditorProps) {
  const { openedFile, updateFile } = useFiles();

  useEffect(() => {
    if (!openedFile) {
      return;
    }
    onChangeTab('code');
  }, [openedFile, onChangeTab]);

  return (
    <div className="relative grow shrink flex flex-col w-full overflow-hidden">
      <PackageInstallToast />

      {tab === 'code' ? (
        /* Careful to ensure this div always consumes full height of parent container and only overflows via scroll */
        <div className="w-full flex-1 overflow-auto">
          {openedFile ? (
            <CodeEditor
              path={openedFile.path}
              source={openedFile.source}
              onChange={(source) => updateFile(openedFile, { source })}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-tertiary-foreground">
              Use the file explorer to open a file for editing
            </div>
          )}
        </div>
      ) : null}

      {/*
        NOTE: applying hidden conditional like this keeps the iframe from getting mounted/unmounted
        and causing a flash of unstyled content
        */}
      <div className={cn('w-full h-full', { hidden: tab !== 'preview' })}>
        <Preview isActive={tab === 'preview'} onShowPackagesPanel={onShowPackagesPanel} />
      </div>
    </div>
  );
}
