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
import {
  deleteFile as doDeleteFile,
  renameFile as doRenameFile,
  loadDirectory,
  loadFile,
} from '@/clients/http/apps';
import { deleteNode, sortTree, updateDirNode, updateFileNode } from './lib/file-tree';

export interface FilesContextValue {
  files: FileType[];
  fileTree: DirEntryType;
  openFile: (entry: FileEntryType) => void;
  renameFile: (entry: FileEntryType, name: string) => void;
  deleteFile: (entry: FileEntryType) => void;
  openFolder: (entry: DirEntryType) => void;
  closeFolder: (entry: DirEntryType) => void;
  toggleFolder: (entry: DirEntryType) => void;
  isFolderOpen: (entry: DirEntryType) => boolean;
  openedFile: FileType | null;
  createFile: (attrs: FileType) => void;
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

  const deleteFile = useCallback(
    async (entry: FileEntryType) => {
      await doDeleteFile(app.id, entry.path);
      delete filesRef.current[entry.path];
      setOpenedFile((openedFile) => {
        if (openedFile && openedFile.path === entry.path) {
          return null;
        }
        return openedFile;
      });
      fileTreeRef.current = deleteNode(fileTreeRef.current, entry.path);
      forceComponentRerender(); // required
    },
    [app.id],
  );

  const renameFile = useCallback(
    async (entry: FileEntryType, name: string) => {
      const { data: newEntry } = await doRenameFile(app.id, entry.path, name);
      const oldFile = filesRef.current[entry.path];
      if (oldFile) {
        const newFile = { ...oldFile, path: newEntry.path, name: newEntry.name };
        delete filesRef.current[oldFile.path];
        filesRef.current[newFile.path] = newFile;
        setOpenedFile((openedFile) => {
          if (openedFile && openedFile.path === oldFile.path) {
            return newFile;
          }
          return openedFile;
        });
      }
      fileTreeRef.current = updateFileNode(fileTreeRef.current, entry, newEntry);
      forceComponentRerender(); // required
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

  const files = Object.values(filesRef.current);

  const context: FilesContextValue = {
    files,
    fileTree: fileTreeRef.current,
    openFile,
    renameFile,
    deleteFile,
    openedFile,
    openFolder,
    closeFolder,
    toggleFolder,
    isFolderOpen,
    createFile,
    updateFile,
  };

  return <FilesContext.Provider value={context}>{children}</FilesContext.Provider>;
}

export function useFiles(): FilesContextValue {
  return useContext(FilesContext) as FilesContextValue;
}
