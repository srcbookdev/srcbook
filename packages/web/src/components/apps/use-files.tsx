import React, { createContext, useCallback, useContext, useReducer, useRef, useState } from 'react';

import type { FileType, DirEntryType, FileEntryType, AppType } from '@srcbook/shared';
import { AppChannel } from '@/clients/websocket';
import {
  createFile as doCreateFile,
  deleteFile as doDeleteFile,
  renameFile as doRenameFile,
  createDirectory,
  deleteDirectory,
  renameDirectory,
  loadDirectory,
  loadFile,
} from '@/clients/http/apps';
import {
  createNode,
  deleteNode,
  renameDirNode,
  sortTree,
  updateDirNode,
  updateFileNode,
} from './lib/file-tree';

export interface FilesContextValue {
  fileTree: DirEntryType;
  openFile: (entry: FileEntryType) => void;
  createFile: (dirname: string, basename: string, source?: string) => void;
  renameFile: (entry: FileEntryType, name: string) => void;
  deleteFile: (entry: FileEntryType) => void;
  openFolder: (entry: DirEntryType) => void;
  closeFolder: (entry: DirEntryType) => void;
  toggleFolder: (entry: DirEntryType) => void;
  isFolderOpen: (entry: DirEntryType) => boolean;
  createFolder: (dirname: string, basename: string) => void;
  deleteFolder: (entry: DirEntryType) => void;
  renameFolder: (entry: DirEntryType, name: string) => void;
  openedFile: FileType | null;
  updateFile: (file: FileType, attrs: Partial<FileType>) => void;
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

  const fileTreeRef = useRef<DirEntryType>(sortTree(rootDirEntries));
  const openedDirectoriesRef = useRef<Set<string>>(new Set());

  const [openedFile, setOpenedFile] = useState<FileType | null>(null);

  const openFile = useCallback(
    async (entry: FileEntryType) => {
      const { data: file } = await loadFile(app.id, entry.path);
      setOpenedFile(file);
    },
    [app.id],
  );

  const createFile = useCallback(
    async (dirname: string, basename: string, source?: string) => {
      source = source || '';
      const { data: fileEntry } = await doCreateFile(app.id, dirname, basename, source);
      fileTreeRef.current = createNode(fileTreeRef.current, fileEntry);
      forceComponentRerender(); // required
      openFile(fileEntry);
    },
    [app.id, openFile],
  );

  const updateFile = useCallback(
    (file: FileType, attrs: Partial<FileType>) => {
      const updatedFile: FileType = { ...file, ...attrs };
      channel.push('file:updated', { file: updatedFile });
      setOpenedFile(updatedFile);
      forceComponentRerender();
    },
    [channel],
  );

  const deleteFile = useCallback(
    async (entry: FileEntryType) => {
      await doDeleteFile(app.id, entry.path);
      setOpenedFile((openedFile) => {
        if (openedFile && openedFile.path === entry.path) {
          return null;
        }
        return openedFile;
      });
      fileTreeRef.current = deleteNode(fileTreeRef.current, entry.path);
      forceComponentRerender(); // required
    },
    [app.id, openedFile],
  );

  const renameFile = useCallback(
    async (entry: FileEntryType, name: string) => {
      const { data: newEntry } = await doRenameFile(app.id, entry.path, name);
      if (openedFile && openedFile.path === entry.path) {
        setOpenedFile({ ...openedFile, path: newEntry.path, name: newEntry.name });
      }
      fileTreeRef.current = updateFileNode(fileTreeRef.current, entry, newEntry);
      forceComponentRerender(); // required
    },
    [app.id, openedFile],
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
      fileTreeRef.current = updateDirNode(fileTreeRef.current, directory);
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

  const createFolder = useCallback(
    async (dirname: string, basename: string) => {
      const { data: folderEntry } = await createDirectory(app.id, dirname, basename);
      fileTreeRef.current = createNode(fileTreeRef.current, folderEntry);
      forceComponentRerender(); // required
      openFolder(folderEntry);
    },
    [app.id, openFolder],
  );

  const deleteFolder = useCallback(
    async (entry: DirEntryType) => {
      await deleteDirectory(app.id, entry.path);
      if (openedFile && openedFile.path.startsWith(entry.path)) {
        setOpenedFile(null);
      }
      openedDirectoriesRef.current.delete(entry.path);
      fileTreeRef.current = deleteNode(fileTreeRef.current, entry.path);
      forceComponentRerender(); // required
    },
    [app.id, openedFile],
  );

  const renameFolder = useCallback(
    async (entry: DirEntryType, name: string) => {
      const { data: newEntry } = await renameDirectory(app.id, entry.path, name);

      if (openedFile && openedFile.path.startsWith(entry.path)) {
        setOpenedFile({ ...openedFile, path: openedFile.path.replace(entry.path, newEntry.path) });
      }

      if (openedDirectoriesRef.current.has(entry.path)) {
        openedDirectoriesRef.current.delete(entry.path);
        openedDirectoriesRef.current.add(newEntry.path);
      }

      fileTreeRef.current = renameDirNode(fileTreeRef.current, entry, newEntry);

      forceComponentRerender(); // required
    },
    [app.id, openedFile],
  );

  const context: FilesContextValue = {
    fileTree: fileTreeRef.current,
    openFile,
    renameFile,
    deleteFile,
    openedFile,
    openFolder,
    closeFolder,
    toggleFolder,
    isFolderOpen,
    createFolder,
    deleteFolder,
    renameFolder,
    createFile,
    updateFile,
  };

  return <FilesContext.Provider value={context}>{children}</FilesContext.Provider>;
}

export function useFiles(): FilesContextValue {
  return useContext(FilesContext) as FilesContextValue;
}
