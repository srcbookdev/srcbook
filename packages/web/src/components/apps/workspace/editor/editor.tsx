import { useFiles } from '../../use-files';
import { Preview } from '../preview';
import { useHeaderTab } from '../../use-header-tab';
import { cn } from '@/lib/utils.ts';
import { CodeEditor } from '../../editor';

export function Editor() {
  const { tab } = useHeaderTab();
  const { openedFile, updateFile } = useFiles();

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
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

      <div className={cn('w-full h-full', { hidden: tab !== 'preview' })}>
        <Preview />
        {/*
          NOTE: applying hidden conditional like this keeps the iframe from getting mounted/unmounted
          and causing a flash of unstyled content
          */}
      </div>
    </div>
  );
}
