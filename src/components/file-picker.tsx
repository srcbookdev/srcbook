import { Form } from 'react-router-dom';
import { useState } from 'react';
import { FileCode, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { disk } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import type { FsObjectType } from '@/types';

export default function FilePicker({
  initialPath,
  initialEntries,
  cta,
}: {
  initialPath: string;
  initialEntries: FsObjectType[];
  cta: string;
}) {
  const [path, setPath] = useState(initialPath);
  const [entries, setEntries] = useState(initialEntries);
  const [selected, setSelected] = useState<FsObjectType | null>(null);

  async function onClick(entry: FsObjectType) {
    if (selected && selected.path === entry.path) {
      // Deselecting a file
      setSelected(null);
      setPath(entry.parentPath);
    } else if (!entry.isDirectory) {
      // Selecting a file
      setSelected(entry);
      setPath(entry.path);
    } else {
      // Opening a directory
      setSelected(null);
      const { result } = await disk({ path: entry.path });
      setPath(result.path);
      setEntries(result.entries);
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <Form method="post" className="flex items-center space-x-2">
        <input type="hidden" name="formId" value="open" />
        <Input value={path} name="path" readOnly />
        <Button variant="default" className="min-w-32" type="submit" disabled={selected === null}>
          {cta}
        </Button>
      </Form>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {entries.map((entry) => (
          <FsEntryItem
            key={entry.path}
            entry={entry}
            onClick={onClick}
            selected={selected !== null && selected.path === entry.path}
          />
        ))}
      </ul>
    </div>
  );
}

export function DirPicker({
  initialPath,
  initialEntries,
  cta,
}: {
  initialPath: string;
  initialEntries: FsObjectType[];
  cta: string;
}) {
  const [path, setPath] = useState(initialPath);
  const [entries, setEntries] = useState(initialEntries.filter((entry) => entry.isDirectory));
  const [selected, setSelected] = useState<FsObjectType | null>(null);

  async function onClick(entry: FsObjectType) {
    if (!entry.isDirectory) {
      setSelected(entry);
      setPath(entry.path);
    } else {
      // Opening a directory
      setSelected(entry);
      const { result } = await disk({ path: entry.path, includeHidden: true });
      setPath(result.path);
      setEntries(result.entries.filter((entry) => entry.isDirectory));
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <Form method="post" className="flex items-center space-x-2">
        <input type="hidden" name="formId" value="open" />
        <Input value={path} name="path" readOnly />
        <Button variant="default" className="min-w-32" type="submit" disabled={selected === null}>
          {cta}
        </Button>
      </Form>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {entries.map((entry) => (
          <FsEntryItem
            key={entry.path}
            entry={entry}
            onClick={onClick}
            selected={selected !== null && selected.path === entry.path}
          />
        ))}
      </ul>
    </div>
  );
}

function FsEntryItem({
  entry,
  onClick,
  selected,
}: {
  entry: FsObjectType;
  selected: boolean;
  onClick: Function;
}) {
  const Icon = entry.isDirectory ? Folder : FileCode;

  return (
    <li
      className={cn(
        'p-2 flex items-center text-sm cursor-pointer rounded',
        selected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent hover:text-accent-foreground',
      )}
      onClick={() => onClick(entry)}
    >
      <Icon size={16} />
      <span className="ml-1.5 truncate">{entry.name}</span>
    </li>
  );
}
