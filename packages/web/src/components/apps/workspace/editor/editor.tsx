import { useFiles } from '../../use-files';
import { AppType, FileType } from '@srcbook/shared';
import { EditorHeaderTab } from './header';
import { extname } from '../../lib/path';
import { useState } from 'react';
import { Preview } from '../preview';
import { cn } from '@/lib/utils.ts';
import { CodeEditor } from '../../editor';

type EditorProps = { tab: EditorHeaderTab }

export function Editor({ tab }: EditorProps) {
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

      {/*
        NOTE: applying hidden conditional like this keeps the iframe from getting mounted/unmounted
        and causing a flash of unstyled content
        */}
      <div className={cn('w-full h-full', { hidden: tab !== 'preview' })}>
        <Preview isActive={tab === "preview"} />
      </div>
    </div>
  );
}
