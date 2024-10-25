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
import { useVersion } from '../use-version';

export default function ExplorerPanel() {
  const { fileTree } = useFiles();
  const { currentVersion } = useVersion();
  const [editingEntry, setEditingEntry] = useState<FileEntryType | DirEntryType | null>(null);
  const [newEntry, setNewEntry] = useState<FileEntryType | DirEntryType | null>(null);

  return (
    <div className="flex flex-col justify-between min-h-full">
      <ContextMenu>
        <ContextMenuTrigger>
          <ul className="w-full h-full text-sm font-medium text-tertiary-foreground overflow-auto">
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
            onClick={() =>
              setNewEntry({ type: 'file', path: 'untitled', dirname: '.', basename: 'untitled' })
            }
          >
            New file...
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              setNewEntry({
                type: 'directory',
                path: 'untitled',
                dirname: '.',
                basename: 'untitled',
                children: null,
              })
            }
          >
            New folder...
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {currentVersion && (
        <p className="font-mono text-tertiary-foreground rounded px-1.5 py-0.5 bg-muted text-xs w-fit m-1">
          version: {currentVersion.sha.slice(0, 7)}
        </p>
      )}
    </div>
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

  if (newEntry !== null && newEntry.type === 'directory' && newEntry.dirname === tree.path) {
    elements.push(
      <li key={newEntry.path}>
        <EditNameNode
          depth={depth}
          name={newEntry.basename}
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
            name={entry.basename}
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
            label={entry.basename}
            opened={opened}
            onClick={() => toggleFolder(entry)}
            onDelete={() => deleteFolder(entry)}
            onRename={() => setEditingEntry(entry)}
            onNewFile={() => {
              if (!isFolderOpen(entry)) {
                openFolder(entry);
              }
              setNewEntry({
                type: 'file',
                path: entry.path + '/untitled',
                dirname: entry.path,
                basename: 'untitled',
              });
            }}
            onNewfolder={() => {
              if (!isFolderOpen(entry)) {
                openFolder(entry);
              }
              setNewEntry({
                type: 'directory',
                path: entry.path + '/untitled',
                dirname: entry.path,
                basename: 'untitled',
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

  if (newEntry !== null && newEntry.type === 'file' && newEntry.dirname === tree.path) {
    elements.push(
      <li key={newEntry.path}>
        <EditNameNode
          depth={depth}
          name={newEntry.basename}
          onSubmit={async (name) => {
            const diskEntry = await createFile(tree.path, name);
            openFile(diskEntry);
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
            name={entry.basename}
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
            label={entry.basename}
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
      <ContextMenuContent
        onCloseAutoFocus={(e) => {
          // This is an important line of code. It is needed to prevent focus
          // from returning to other elements when this menu is closed. Without this,
          // when a user clicks "New [file|folder]" or "Rename", the input box will
          // render and sometimes immediately dismiss because this returns focus to
          // the button element the user right clicked on, causing the input's onBlur
          // to trigger.
          e.preventDefault();
        }}
      >
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
    function focusAndSelect() {
      const input = ref.current;

      if (input) {
        input.focus();
        const idx = input.value.lastIndexOf('.');
        input.setSelectionRange(0, idx === -1 ? input.value.length : idx);
      }
    }

    // This setTimeout is intentional. We need to draw focus to this
    // input after the current event loop clears out because other elements
    // are getting focused in some situations immediately after this renders.
    setTimeout(focusAndSelect, 0);
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
      {icon} <span className="truncate font-light">{label}</span>
    </button>
  );
}
