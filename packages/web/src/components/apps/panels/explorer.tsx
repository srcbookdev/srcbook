import { FileIcon, ChevronRightIcon, type LucideIcon, ChevronDownIcon } from 'lucide-react';
import { useFiles } from '../use-files';
import type { DirEntryType } from '@srcbook/shared';
import { cn } from '@srcbook/components';

export default function ExplorerPanel() {
  const { fileTree } = useFiles();

  return (
    <ul className="w-full text-sm text-tertiary-foreground overflow-auto">
      <FileTree depth={1} tree={fileTree} />
    </ul>
  );
}

type FileTreePropsType = {
  depth: number;
  tree: DirEntryType;
};

function FileTree({ depth, tree }: FileTreePropsType) {
  const { openFile, toggleFolder, isFolderOpen, openedFile } = useFiles();

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
        elements.push(<FileTree key={entry.path + '-tree'} depth={depth + 1} tree={entry} />);
      }

      return elements;
    } else {
      return (
        <li key={entry.path}>
          <Node
            depth={depth}
            icon={FileIcon}
            label={entry.name}
            active={openedFile?.path === entry.path}
            onClick={() => openFile(entry)}
          />
        </li>
      );
    }
  });
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
