import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import type { FilePayloadType, FileType } from '@srcbook/shared';
import { AppChannel } from '@/clients/websocket';

export type DirEntryType = { directory: true; name: string; children: FileTreeType };
export type FileEntryType = { directory: false; name: string; file: FileType };
export type FileTreeType = Array<FileEntryType | DirEntryType>;

function createSortedFileTree(files: FileType[]): FileTreeType {
  const tree = createFileTree(files);
  sortTree(tree);
  return tree;
}

function sortTree(tree: FileTreeType) {
  tree.sort((a, b) => {
    if (a.directory) sortTree(a.children);
    if (b.directory) sortTree(b.children);
    if (a.directory && !b.directory) return -1;
    if (!a.directory && b.directory) return 1;
    return a.name.localeCompare(b.name);
  });
}

function createFileTree(files: FileType[]): FileTreeType {
  const result: FileTreeType = [];

  for (const file of files) {
    let current = result;

    const parts = file.path.split('/');

    if (parts.length === 1) {
      current.push({ directory: false, name: file.path, file });
      continue;
    }

    const lastIdx = parts.length - 1;

    for (let i = 0; i < lastIdx; i++) {
      const dirEntry = current.find((entry) => entry.directory && entry.name === parts[i]) as
        | DirEntryType
        | undefined;

      if (!dirEntry) {
        const next: DirEntryType = { directory: true, name: parts[i]!, children: [] };
        current.push(next);
        current = next.children;
      } else {
        current = dirEntry.children;
      }
    }

    current.push({ directory: false, name: parts[lastIdx]!, file });
  }

  return result;
}

export interface FilesContextValue {
  files: FileType[];
  fileTree: FileTreeType;
  openedFile: FileType | null;
  setOpenedFile: React.Dispatch<React.SetStateAction<FileType | null>>;
  createFile: (attrs: FileType) => void;
  updateFile: (file: FileType, attrs: Partial<FileType>) => void;
  deleteFile: (file: FileType) => void;
}

const FilesContext = createContext<FilesContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
};

export function FilesProvider({ channel, children }: ProviderPropsType) {
  // Because we use refs for our state, we need a way to trigger
  // component re-renders when the ref state changes.
  //
  // https://legacy.reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  //
  const [, forceComponentRerender] = useReducer((x) => x + 1, 0);

  const filesRef = useRef<Record<string, FileType>>({});

  const [openedFile, setOpenedFile] = useState<FileType | null>(null);

  useEffect(() => {
    function onFile(payload: FilePayloadType) {
      filesRef.current[payload.file.path] = payload.file;
      forceComponentRerender();
    }
    channel.on('file', onFile);
    return () => channel.off('file', onFile);
  }, [channel, forceComponentRerender]);

  const createFile = useCallback((file: FileType) => {
    filesRef.current[file.path] = file;
    forceComponentRerender();
  }, []);

  const updateFile = useCallback(
    (file: FileType, attrs: Partial<FileType>) => {
      const updatedFile: FileType = { ...file, ...attrs };
      filesRef.current[file.path] = updatedFile;
      channel.push('file:updated', { file: updatedFile });
      forceComponentRerender();
    },
    [channel],
  );

  const deleteFile = useCallback((file: FileType) => {
    delete filesRef.current[file.path];
    forceComponentRerender();
  }, []);

  const files = Object.values(filesRef.current);
  const fileTree = createSortedFileTree(files);

  const context: FilesContextValue = {
    files,
    fileTree,
    openedFile,
    setOpenedFile,
    createFile,
    updateFile,
    deleteFile,
  };

  return <FilesContext.Provider value={context}>{children}</FilesContext.Provider>;
}

export function useFiles(): FilesContextValue {
  return useContext(FilesContext) as FilesContextValue;
}
