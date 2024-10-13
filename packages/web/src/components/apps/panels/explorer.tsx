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
import { dirname } from '../lib/path';

export default function ExplorerPanel() {
  const { fileTree } = useFiles();

  const [editingEntry, setEditingEntry] = useState<FileEntryType | DirEntryType | null>(null);
  const [newEntry, setNewEntry] = useState<FileEntryType | DirEntryType | null>(null);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <ul className="w-full h-full text-sm text-tertiary-foreground overflow-auto">
          <FileTree
            depth={1}
            tree={fileTree}
            newEntry={newEntry}
            setNewEntry={setNewEntry}
            editingEntry={editingEntry}
            setEditingEntry={setEditingEntry}
          />
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
  newEntry: FileEntryType | DirEntryType | null;
  setNewEntry: (entry: FileEntryType | DirEntryType | null) => void;
  editingEntry: FileEntryType | DirEntryType | null;
  setEditingEntry: (entry: FileEntryType | DirEntryType | null) => void;
}) {
  const { depth, tree, newEntry, setNewEntry, editingEntry, setEditingEntry } = props;

  const {
    openFile,
    createFile,
    deleteFile,
    renameFile,
    openedFile,
    toggleFolder,
    isFolderOpen,
    openFolder,
    createFolder,
    deleteFolder,
    renameFolder,
  } = useFiles();

  if (tree.children === null) {
    return null;
  }

  const dirEntries = [];
  const fileEntries = [];

  for (const entry of tree.children) {
    if (entry.type === 'directory') {
      dirEntries.push(entry);
    } else {
      fileEntries.push(entry);
    }
  }

  const elements = [];

  if (newEntry !== null && newEntry.type === 'directory' && dirname(newEntry.path) === tree.path) {
    elements.push(
      <li key={newEntry.path}>
        <EditNameNode
          depth={depth}
          name={newEntry.name}
          onSubmit={(name) => {
            createFolder(tree.path, name);
            setNewEntry(null);
          }}
          onCancel={() => setNewEntry(null)}
        />
      </li>,
    );
  }

  for (const entry of dirEntries) {
    const opened = isFolderOpen(entry);

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
            onNewFile={() => {
              if (!isFolderOpen(entry)) {
                openFolder(entry);
              }
              setNewEntry({ type: 'file', path: entry.path + '/untitled', name: 'untitled' });
            }}
            onNewfolder={() => {
              if (!isFolderOpen(entry)) {
                openFolder(entry);
              }
              setNewEntry({
                type: 'directory',
                path: entry.path + '/untitled',
                name: 'untitled',
                children: null,
              });
            }}
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
          newEntry={newEntry}
          setNewEntry={setNewEntry}
          editingEntry={editingEntry}
          setEditingEntry={setEditingEntry}
        />,
      );
    }
  }
  2;
  if (newEntry !== null && newEntry.type === 'file' && dirname(newEntry.path) === tree.path) {
    elements.push(
      <li key={newEntry.path}>
        <EditNameNode
          depth={depth}
          name={newEntry.name}
          onSubmit={(name) => {
            createFile(tree.path, name);
            setNewEntry(null);
          }}
          onCancel={() => setNewEntry(null)}
        />
      </li>,
    );
  }

  for (const entry of fileEntries) {
    if (entry.path === editingEntry?.path) {
      elements.push(
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
        </li>,
      );
    } else {
      elements.push(
        <li key={entry.path}>
          <FileNode
            depth={depth}
            label={entry.name}
            active={openedFile?.path === entry.path}
            onClick={() => openFile(entry)}
            onDelete={() => deleteFile(entry)}
            onRename={() => setEditingEntry(entry)}
          />
        </li>,
      );
    }
  }

  return elements;
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
  onNewFile: () => void;
  onNewfolder: () => void;
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
        <ContextMenuItem onClick={props.onNewFile}>New file...</ContextMenuItem>
        <ContextMenuItem onClick={props.onNewfolder}>New folder...</ContextMenuItem>
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
    const input = ref.current;
    if (!input) return;

    const focusAndSelect = () => {
      input.focus();
      const idx = input.value.lastIndexOf('.');
      input.setSelectionRange(0, idx === -1 ? input.value.length : idx);
    };

    focusAndSelect();

    // Re-focus if the input loses focus
    const handleFocusOut = () => {
      if (document.activeElement !== input) {
        focusAndSelect();
      }
    };

    document.addEventListener('focusin', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusOut);
    };
  }, []);

  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Only cancel if the new active element is outside this component
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      props.onCancel();
    }
  }

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
      onBlur={onBlur}
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
