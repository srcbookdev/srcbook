import { useEffect, useRef, useState } from 'react';
import { FileIcon, ChevronRightIcon } from 'lucide-react';
import { useFiles } from '../use-files';
import type { DirEntryType, FileEntryType } from '@srcbook/shared';
import { cn } from '@srcbook/components';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@srcbook/components/src/components/ui/context-menu';

export default function ExplorerPanel() {
  const { fileTree, createFile, createFolder } = useFiles();

  const [editingEntry, setEditingEntry] = useState<FileEntryType | DirEntryType | null>(null);
  const [newEntry, setNewEntry] = useState<FileEntryType | DirEntryType | null>(null);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <ul className="w-full h-full text-sm text-tertiary-foreground overflow-auto">
          <FileTree
            depth={1}
            tree={fileTree}
            editingEntry={editingEntry}
            setEditingEntry={setEditingEntry}
          />
          {newEntry && (
            <EditNameNode
              depth={1}
              name={newEntry.name}
              onSubmit={(name) => {
                if (newEntry.type === 'directory') {
                  createFolder('.', name);
                } else {
                  createFile('.', name);
                }
                setNewEntry(null);
              }}
              onCancel={() => setNewEntry(null)}
            />
          )}
        </ul>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => setNewEntry({ type: 'file', path: 'untitled', name: 'untitled' })}
        >
          New file...
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() =>
            setNewEntry({ type: 'directory', path: 'untitled', name: 'untitled', children: null })
          }
        >
          New folder...
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FileTree(props: {
  depth: number;
  tree: DirEntryType;
  editingEntry: FileEntryType | DirEntryType | null;
  setEditingEntry: (entry: FileEntryType | DirEntryType | null) => void;
}) {
  const { depth, tree, editingEntry, setEditingEntry } = props;

  const {
    openFile,
    deleteFile,
    renameFile,
    openedFile,
    toggleFolder,
    isFolderOpen,
    deleteFolder,
    renameFolder,
  } = useFiles();

  if (tree.children === null) {
    return null;
  }

  return tree.children.flatMap((entry) => {
    if (entry.type === 'directory') {
      const opened = isFolderOpen(entry);
      const elements = [];

      if (editingEntry?.path === entry.path) {
        elements.push(
          <li key={entry.path}>
            <EditNameNode
              depth={depth}
              name={entry.name}
              onSubmit={(name) => {
                renameFolder(entry, name);
                setEditingEntry(null);
              }}
              onCancel={() => setEditingEntry(null)}
            />
          </li>,
        );
      } else {
        elements.push(
          <li key={entry.path}>
            <FolderNode
              depth={depth}
              label={entry.name}
              opened={opened}
              onClick={() => toggleFolder(entry)}
              onDelete={() => deleteFolder(entry)}
              onRename={() => setEditingEntry(entry)}
            />
          </li>,
        );
      }

      if (opened) {
        elements.push(
          <FileTree
            key={entry.path + '-tree'}
            depth={depth + 1}
            tree={entry}
            editingEntry={editingEntry}
            setEditingEntry={setEditingEntry}
          />,
        );
      }

      return elements;
    } else {
      return entry.path === editingEntry?.path ? (
        <li key={entry.path}>
          <EditNameNode
            depth={depth}
            name={entry.name}
            onSubmit={(name) => {
              renameFile(entry, name);
              setEditingEntry(null);
            }}
            onCancel={() => setEditingEntry(null)}
          />
        </li>
      ) : (
        <li key={entry.path}>
          <FileNode
            depth={depth}
            label={entry.name}
            active={openedFile?.path === entry.path}
            onClick={() => openFile(entry)}
            onDelete={() => deleteFile(entry)}
            onRename={() => setEditingEntry(entry)}
          />
        </li>
      );
    }
  });
}

function FileNode(props: {
  depth: number;
  label: string;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Node {...props} icon={<FileIcon size={12} />} />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={props.onRename}>Rename</ContextMenuItem>
        <ContextMenuItem onClick={props.onDelete}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FolderNode(props: {
  depth: number;
  label: string;
  opened: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Node
          {...props}
          icon={
            <ChevronRightIcon
              size={12}
              className={cn(
                'transition-transform duration-100',
                props.opened && 'transform rotate-90',
              )}
            />
          }
        />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={props.onRename}>Rename</ContextMenuItem>
        <ContextMenuItem onClick={props.onDelete}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function EditNameNode(props: {
  depth: number;
  name: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const input = ref.current;
      if (!input) return;
      const idx = input.value.lastIndexOf('.');
      input.setSelectionRange(0, idx === -1 ? input.value.length : idx);
      input.focus();
    }, 25);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <input
      ref={ref}
      defaultValue={props.name}
      className={cn(
        'flex h-8 w-full rounded-sm border border-ring bg-transparent px-3 py-2 text-sm transition-colors',
        'placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        '[&::selection]:bg-accent [&::selection]:text-accent-foreground',
      )}
      style={{ paddingLeft: `${props.depth * 12}px` }}
      onBlur={props.onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && ref.current) {
          e.preventDefault();
          e.stopPropagation();
          props.onSubmit(ref.current.value);
        } else if (e.key === 'Escape') {
          ref.current?.blur();
        }
      }}
    />
  );
}

function Node(props: {
  depth: number;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  const { depth, label, icon, active, onClick } = props;

  return (
    <button
      onClick={onClick}
      className={cn(
        'py-1 px-2 leading-5 w-full flex items-center gap-1.5 cursor-pointer rounded-sm hover:bg-sb-core-20 dark:hover:bg-sb-core-110',
        active && 'text-foreground',
      )}
      style={{ paddingLeft: `${depth * 12}px` }}
      title={label}
    >
      {icon} <span className="truncate">{label}</span>
    </button>
  );
}
