import { Form, useSubmit } from 'react-router-dom';
import { useRef, useState } from 'react';
import { FileCode, Folder } from 'lucide-react';
import { cn, splitPath } from '@/lib/utils';
import { disk, importSrcbook } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import type { FsObjectType } from '@/types';

export default function FilePicker(props: {
  dirname: string;
  entries: FsObjectType[];
  cta: string;
}) {
  const [dirname, setDirname] = useState(props.dirname);
  const [entries, setEntries] = useState(props.entries);
  const [selected, setSelected] = useState<FsObjectType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const submit = useSubmit();

  async function onClick(entry: FsObjectType) {
    if (selected && selected.path === entry.path) {
      // Deselecting a file
      setSelected(null);
      setDirname(entry.dirname);
    } else if (!entry.isDirectory) {
      // Selecting a file
      setSelected(entry);
      setDirname(entry.dirname);
    } else {
      // Opening a directory
      setSelected(null);
      const { result } = await disk({ dirname: entry.path });
      setDirname(result.dirname);
      setEntries(result.entries);
    }
  }

  async function createSrcbookFromSrcmdFile() {
    if (selected === null || selected.isDirectory) {
      console.error('Cannot create srcbook from invalid selection. This is a bug in the code.');
      console.log('Selection:', selected);
      return;
    }

    setSubmitting(true);

    const { result } = await importSrcbook({ path: selected.path });

    inputRef.current!.value = result.dir;
    submit(formRef.current);
  }

  return (
    <div className="space-y-4 mt-4 w-full">
      <Form ref={formRef} method="post" className="flex items-center space-x-2 w-full">
        <Input value={selected?.path || dirname} name="srcmdpath" readOnly />
        <input ref={inputRef} type="hidden" name="path" value="" />
        <Button
          className="w-32"
          type="button"
          disabled={selected === null || submitting}
          onClick={createSrcbookFromSrcmdFile}
        >
          {props.cta}
        </Button>
      </Form>

      <ul className="flex flex-wrap max-h-[383px] overflow-y-scroll bg-gray-50 p-2 rounded">
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

export function DirPicker(props: { dirname: string; entries: FsObjectType[]; cta: string }) {
  const [dirname, setDirname] = useState(props.dirname);
  const [entries, setEntries] = useState(props.entries.filter((entry) => entry.isDirectory));
  const [selected, setSelected] = useState<null | FsObjectType>(null);

  async function onClick(entry: FsObjectType) {
    setSelected(entry);
    const { result } = await disk({ dirname: entry.path });
    setDirname(result.dirname);
    setEntries(result.entries.filter((entry) => entry.isDirectory));
  }

  return (
    <div className="space-y-4 mt-4 w-full">
      <Form method="post" className="flex items-center space-x-2 w-full">
        <Input value={dirname} name="path" readOnly />
        <Button className="w-32" type="submit" disabled={selected === null}>
          {props.cta}
        </Button>
      </Form>

      <ul className="flex flex-wrap max-h-[383px] overflow-y-scroll bg-gray-50 p-2 rounded">
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
  boldPrefix = '',
}: {
  entry: FsObjectType;
  selected: boolean;
  onClick: (entry: FsObjectType) => void;
  boldPrefix?: string;
}) {
  const Icon = entry.isDirectory ? Folder : FileCode;

  const boldedBasename = (
    <>
      <span className="ml-1.5 font-semibold">{boldPrefix}</span>
      <span className="truncate">{entry.basename.replace(boldPrefix, '')}</span>
    </>
  );
  return (
    <li
      className={cn(
        'my-0.5 py-2 flex items-center text-sm cursor-pointer rounded w-1/2 md:w-1/3',
        selected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent hover:text-accent-foreground',
      )}
      onClick={() => onClick(entry)}
    >
      <Icon size={16} />
      {boldedBasename}
    </li>
  );
}

export function FileSaver(props: {
  dirname: string;
  filename?: string;
  entries: FsObjectType[];
  onSave: (path: string) => void;
}) {
  const [dirname, setDirname] = useState(props.dirname);
  const [query, setQuery] = useState(props.filename || props.dirname);
  const [boldPrefix, setBoldPrefix] = useState<string>('');
  const [entries, _setEntries] = useState(props.entries);
  const [filteredEntries, setFilteredEntries] = useState<FsObjectType[]>(props.entries);

  const setEntries = (entries: FsObjectType[], basename: string) => {
    _setEntries(entries);
    setFilteredEntries(entries.filter((entry) => entry.basename.startsWith(basename)));
  };

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { basename, dirname: newDir } = splitPath(e.target.value);
    if (newDir !== dirname) {
      setDirname(newDir);
      disk({ dirname: newDir }).then(({ result }) => {
        setEntries(result.entries, basename);
        setBoldPrefix(basename);
        setQuery(e.target.value);
      });
    }
    setEntries(entries, basename);
    setBoldPrefix(basename);
    setQuery(e.target.value);
  }

  function suffixQuery(query: string) {
    return query.endsWith('.srcmd') ? query : query + '.srcmd';
  }

  async function onClick(entry: FsObjectType) {
    if (!entry.isDirectory) {
      // Clicking a file
      setDirname(entry.dirname);
      setQuery(entry.path);
    } else {
      // Opening a directory
      const { result } = await disk({ dirname: entry.path });
      setDirname(result.dirname);
      setQuery(result.dirname);
      setEntries(result.entries, '');
      setFilteredEntries([]);
    }
  }
  return (
    <div className="space-y-4 mt-4 w-full">
      <Input className="mb-2" value={query} name="path" onChange={onChange} />

      <div className="flex flex-col h-[383px] bg-gray-50 p-2 rounded border border-input overflow-y-scroll divide-y divide-dashed">
        <ul className="flex flex-wrap">
          {filteredEntries &&
            filteredEntries.map((entry) => (
              <FsEntryItem
                key={entry.path}
                entry={entry}
                onClick={onClick}
                selected={false}
                boldPrefix={boldPrefix}
              />
            ))}
        </ul>
        <ul className="flex flex-wrap">
          {entries &&
            entries.map((entry) => (
              <FsEntryItem key={entry.path} entry={entry} onClick={onClick} selected={false} />
            ))}
        </ul>
      </div>
      <h2 className="mt-4 font-semibold">File</h2>
      <p className="font-mono text-sm">{suffixQuery(query)}</p>
      <Button
        variant="default"
        className="mt-4"
        type="submit"
        disabled={query.endsWith('/.srcmd')}
        onClick={() => props.onSave(suffixQuery(query))}
      >
        Save
      </Button>
    </div>
  );
}
