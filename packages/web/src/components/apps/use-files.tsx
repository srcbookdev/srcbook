import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import type {
  FilePayloadType,
  FileType,
  DirEntryType,
  FileEntryType,
  AppType,
} from '@srcbook/shared';
import { AppChannel } from '@/clients/websocket';
import { loadDirectory, loadFile } from '@/clients/http/apps';
import { sortTree, updateTree } from './lib/file-tree';

export interface FilesContextValue {
  files: FileType[];
  fileTree: DirEntryType;
  openFile: (entry: FileEntryType) => void;
  openFolder: (entry: DirEntryType) => void;
  closeFolder: (entry: DirEntryType) => void;
  toggleFolder: (entry: DirEntryType) => void;
  isFolderOpen: (entry: DirEntryType) => boolean;
  openedFile: FileType | null;
  createFile: (attrs: FileType) => void;
  updateFile: (file: FileType, attrs: Partial<FileType>) => void;
  deleteFile: (file: FileType) => void;
}

const FilesContext = createContext<FilesContextValue | undefined>(undefined);

type ProviderPropsType = {
  app: AppType;
  channel: AppChannel;
  children: React.ReactNode;
  rootDirEntries: DirEntryType;
};

export function FilesProvider({ app, channel, rootDirEntries, children }: ProviderPropsType) {
  // Because we use refs for our state, we need a way to trigger
  // component re-renders when the ref state changes.
  //
  // https://legacy.reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  //
  const [, forceComponentRerender] = useReducer((x) => x + 1, 0);

  const filesRef = useRef<Record<string, FileType>>({});
  const fileTreeRef = useRef<DirEntryType>(sortTree(rootDirEntries));
  const openedDirectoriesRef = useRef<Set<string>>(new Set());

  const [openedFile, setOpenedFile] = useState<FileType | null>(null);

  useEffect(() => {
    function onFile(payload: FilePayloadType) {
      filesRef.current[payload.file.path] = payload.file;
      forceComponentRerender();
    }
    channel.on('file', onFile);
    return () => channel.off('file', onFile);
  }, [channel, forceComponentRerender]);

  const openFile = useCallback(
    async (entry: FileEntryType) => {
      const { data: file } = await loadFile(app.id, entry.path);
      filesRef.current[file.path] = file;
      setOpenedFile(file);
    },
    [app.id],
  );

  const isFolderOpen = useCallback((entry: DirEntryType) => {
    return openedDirectoriesRef.current.has(entry.path);
  }, []);

  const openFolder = useCallback(
    async (entry: DirEntryType) => {
      // Optimistically open the folder.
      openedDirectoriesRef.current.add(entry.path);
      forceComponentRerender();
      const { data: directory } = await loadDirectory(app.id, entry.path);
      fileTreeRef.current = sortTree(updateTree(fileTreeRef.current, directory));
      forceComponentRerender();
    },
    [app.id],
  );

  const closeFolder = useCallback((entry: DirEntryType) => {
    openedDirectoriesRef.current.delete(entry.path);
    forceComponentRerender();
  }, []);

  const toggleFolder = useCallback(
    (entry: DirEntryType) => {
      if (isFolderOpen(entry)) {
        closeFolder(entry);
      } else {
        openFolder(entry);
      }
    },
    [isFolderOpen, openFolder, closeFolder],
  );

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

  const context: FilesContextValue = {
    files,
    fileTree: fileTreeRef.current,
    openFile,
    openedFile,
    openFolder,
    closeFolder,
    toggleFolder,
    isFolderOpen,
    createFile,
    updateFile,
    deleteFile,
  };

  return <FilesContext.Provider value={context}>{children}</FilesContext.Provider>;
}

export function useFiles(): FilesContextValue {
  return useContext(FilesContext) as FilesContextValue;
}
