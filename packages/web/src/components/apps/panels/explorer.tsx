import { useState } from 'react';
import { FileIcon, ChevronRightIcon, type LucideIcon, ChevronDownIcon } from 'lucide-react';
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
  const { fileTree } = useFiles();

  const [editingEntry, setEditingEntry] = useState<FileEntryType | null>(null);

  return (
    <ul className="w-full text-sm text-tertiary-foreground overflow-auto">
      <FileTree
        depth={1}
        tree={fileTree}
        editingEntry={editingEntry}
        setEditingEntry={setEditingEntry}
      />
    </ul>
  );
}

function FileTree(props: {
  depth: number;
  tree: DirEntryType;
  editingEntry: FileEntryType | null;
  setEditingEntry: (entry: FileEntryType | null) => void;
}) {
  const { depth, tree, editingEntry, setEditingEntry } = props;

  const { openFile, deleteFile, renameFile, toggleFolder, isFolderOpen, openedFile } = useFiles();

  if (tree.children === null) {
    return null;
  }

  return tree.children.flatMap((entry) => {
    if (entry.type === 'directory') {
      const opened = isFolderOpen(entry);

      const elements = [
        <li key={entry.path}>
          <Node
            depth={depth}
            icon={opened ? ChevronDownIcon : ChevronRightIcon}
            label={entry.name}
            active={false}
            onClick={() => toggleFolder(entry)}
          />
        </li>,
      ];

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
      return entry.name === editingEntry?.name ? (
        <li key={entry.path}>
          <RenameFileNode
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
            deleteFile={() => deleteFile(entry)}
            renameFile={() => setEditingEntry(entry)}
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
  deleteFile: () => void;
  renameFile: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Node {...props} icon={FileIcon} />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={props.renameFile}>Rename</ContextMenuItem>
        <ContextMenuItem onClick={props.deleteFile}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function RenameFileNode(props: {
  depth: number;
  name: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(props.name);
  return (
    <input
      value={input}
      className="flex h-8 w-full rounded-sm border border-ring bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      /* eslint-disable-next-line jsx-a11y/no-autofocus */
      autoFocus
      onBlur={props.onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          props.onSubmit(input);
        } else if (e.key === 'Escape') {
          props.onCancel();
        }
      }}
      onChange={(e) => setInput(e.currentTarget.value)}
    />
  );
}

function Node(props: {
  depth: number;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  const { depth, label, icon: Icon, active, onClick } = props;

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
      <Icon size={12} /> <span className="truncate">{label}</span>
    </button>
  );
}
