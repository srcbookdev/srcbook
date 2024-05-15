import { Form, useLoaderData, redirect } from 'react-router-dom';
import { useState } from 'react';
import { FileCode, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { disk, createSession } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import type { FsObjectResultType, FsObjectType } from '@/types';

// eslint-disable-next-line
export async function loader() {
  const { result } = await disk();
  return result;
}

// eslint-disable-next-line
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const path = formData.get('path') as string;
  const { result } = await createSession({ path });
  return redirect(`/sessions/${result.id}`);
}

export default function Open() {
  const { path: initialPath, entries: initialEntries } = useLoaderData() as FsObjectResultType;

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
    <>
      <h1 className="text-2xl">Notebooks</h1>
      <div className="space-y-4 mt-4">
        <Form method="post" className="flex items-center space-x-2">
          <input type="hidden" name="formId" value="open" />
          <Input value={path} name="path" readOnly />
          <Button variant="outline" className="min-w-32" type="submit" disabled={selected === null}>
            Open
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
    </>
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
