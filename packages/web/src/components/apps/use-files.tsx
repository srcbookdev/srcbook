import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import type { FileType, DirEntryType, FileEntryType } from '@srcbook/shared';
import { AppChannel } from '@/clients/websocket';
import {
  createFile as doCreateFile,
  deleteFile as doDeleteFile,
  renameFile as doRenameFile,
  createDirectory,
  deleteDirectory,
  renameDirectory,
  loadDirectory,
} from '@/clients/http/apps';
import {
  createNode,
  deleteNode,
  renameDirNode,
  sortTree,
  updateDirNode,
  updateFileNode,
} from './lib/file-tree';
import { useApp } from './use-app';
import { useNavigate } from 'react-router-dom';
import { setLastOpenedFile } from './local-storage';

export interface FilesContextValue {
  fileTree: DirEntryType;
  openedFile: FileType | null;
  openFile: (entry: FileEntryType) => void;
  createFile: (dirname: string, basename: string, source?: string) => Promise<FileEntryType>;
  updateFile: (modified: FileType) => void;
  renameFile: (entry: FileEntryType, name: string) => Promise<void>;
  deleteFile: (entry: FileEntryType) => Promise<void>;
  createFolder: (dirname: string, basename: string) => Promise<void>;
  renameFolder: (entry: DirEntryType, name: string) => Promise<void>;
  deleteFolder: (entry: DirEntryType) => Promise<void>;
  openFolder: (entry: DirEntryType) => Promise<void>;
  closeFolder: (entry: DirEntryType) => void;
  toggleFolder: (entry: DirEntryType) => void;
  isFolderOpen: (entry: DirEntryType) => boolean;
}

const FilesContext = createContext<FilesContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
  initialOpenedFile: FileType | null;
  rootDirEntries: DirEntryType;
};

export function FilesProvider({
  channel,
  rootDirEntries,
  initialOpenedFile,
  children,
}: ProviderPropsType) {
  // Because we use refs for our state, we need a way to trigger
  // component re-renders when the ref state changes.
  //
  // https://legacy.reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  //
  const [, forceComponentRerender] = useReducer((x) => x + 1, 0);

  const { app } = useApp();
  const navigateTo = useNavigate();

  const fileTreeRef = useRef<DirEntryType>(sortTree(rootDirEntries));
  const openedDirectoriesRef = useRef<Set<string>>(new Set());
  const [openedFile, _setOpenedFile] = useState<FileType | null>(initialOpenedFile);

  const setOpenedFile = useCallback(
    (fn: (file: FileType | null) => FileType | null) => {
      _setOpenedFile((prevOpenedFile) => {
        const openedFile = fn(prevOpenedFile);
        if (openedFile) {
          setLastOpenedFile(app.id, openedFile);
        }
        return openedFile;
      });
    },
    [app.id],
  );

  const navigateToFile = useCallback(
    (file: { path: string }) => {
      navigateTo(`/apps/${app.id}/files/${encodeURIComponent(file.path)}`);
    },
    [app.id, navigateTo],
  );

  useEffect(() => {
    if (initialOpenedFile !== null && initialOpenedFile?.path !== openedFile?.path) {
      setOpenedFile(() => initialOpenedFile);
    }
  }, [initialOpenedFile, openedFile?.path, setOpenedFile]);

  const openFile = useCallback(
    (entry: FileEntryType) => {
      navigateToFile(entry);
    },
    [navigateToFile],
  );

  const createFile = useCallback(
    async (dirname: string, basename: string, source?: string) => {
      source = source || '';
      const { data: fileEntry } = await doCreateFile(app.id, dirname, basename, source);
      fileTreeRef.current = createNode(fileTreeRef.current, fileEntry);
      forceComponentRerender(); // required
      return fileEntry;
    },
    [app.id],
  );

  const updateFile = useCallback(
    (modified: FileType) => {
      channel.push('file:updated', { file: modified });
      setOpenedFile(() => modified);
      forceComponentRerender();
    },
    [channel, setOpenedFile],
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
    [app.id, setOpenedFile],
  );

  const renameFile = useCallback(
    async (entry: FileEntryType, name: string) => {
      const { data: newEntry } = await doRenameFile(app.id, entry.path, name);
      setOpenedFile((openedFile) => {
        if (openedFile && openedFile.path === entry.path) {
          return { ...openedFile, path: newEntry.path, name: newEntry.basename };
        }
        return openedFile;
      });
      fileTreeRef.current = updateFileNode(fileTreeRef.current, entry, newEntry);
      forceComponentRerender(); // required
    },
    [app.id, setOpenedFile],
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
      setOpenedFile((openedFile) => {
        if (openedFile && openedFile.path.startsWith(entry.path)) {
          return null;
        }
        return openedFile;
      });
      openedDirectoriesRef.current.delete(entry.path);
      fileTreeRef.current = deleteNode(fileTreeRef.current, entry.path);
      forceComponentRerender(); // required
    },
    [app.id, setOpenedFile],
  );

  const renameFolder = useCallback(
    async (entry: DirEntryType, name: string) => {
      const { data: newEntry } = await renameDirectory(app.id, entry.path, name);

      setOpenedFile((openedFile) => {
        if (openedFile && openedFile.path.startsWith(entry.path)) {
          return { ...openedFile, path: openedFile.path.replace(entry.path, newEntry.path) };
        }
        return openedFile;
      });

      if (openedDirectoriesRef.current.has(entry.path)) {
        openedDirectoriesRef.current.delete(entry.path);
        openedDirectoriesRef.current.add(newEntry.path);
      }

      fileTreeRef.current = renameDirNode(fileTreeRef.current, entry, newEntry);

      forceComponentRerender(); // required
    },
    [app.id, setOpenedFile],
  );

  const context: FilesContextValue = {
    fileTree: fileTreeRef.current,
    openedFile,
    openFile,
    createFile,
    updateFile,
    renameFile,
    deleteFile,
    createFolder,
    renameFolder,
    deleteFolder,
    openFolder,
    closeFolder,
    toggleFolder,
    isFolderOpen,
  };

  return <FilesContext.Provider value={context}>{children}</FilesContext.Provider>;
}

export function useFiles(): FilesContextValue {
  return useContext(FilesContext) as FilesContextValue;
}
