import { Form } from 'react-router-dom';
import { useRef, useState } from 'react';
import { FileCode, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiskResponseType, disk } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import type { FsObjectResultType, FsObjectType } from '@/types';
import useEffectOnce from './use-effect-once';

export function FilePicker(props: {
  dirname: string;
  entries: FsObjectType[];
  cta: string;
  onChange: (entry: FsObjectType) => void;
}) {
  const [dirname, setDirname] = useState(props.dirname);
  const [entries, setEntries] = useState(props.entries);
  const [selected, setSelected] = useState<FsObjectType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onChange(entry: FsObjectType) {
    setSubmitting(false);

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
      return;
    }
    setSubmitting(true);
    props.onChange(selected);
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center space-x-2 w-full">
        <Input
          value={selected?.path || dirname}
          name="srcmdpath"
          readOnly
          tabIndex={-1}
          className="pointer-events-none"
        />
        <Button
          type="button"
          disabled={selected === null || submitting}
          onClick={createSrcbookFromSrcmdFile}
        >
          {props.cta}
        </Button>
      </div>

      <FsEntrySelect entries={entries} selected={selected} onChange={onChange} />
    </div>
  );
}

export function DirPicker(props: { dirname: string; entries: FsObjectType[]; cta: string }) {
  const [dirname, setDirname] = useState(props.dirname);
  const [entries, setEntries] = useState(props.entries.filter((entry) => entry.isDirectory));
  const [selected, setSelected] = useState<null | FsObjectType>(null);

  async function onChange(entry: FsObjectType) {
    setSelected(entry);
    const { result } = await disk({ dirname: entry.path });
    setDirname(result.dirname);
    setEntries(result.entries.filter((entry) => entry.isDirectory));
  }

  return (
    <div className="space-y-4 mt-4 w-full">
      <Form method="post" className="flex items-center space-x-2 w-full">
        <Input value={dirname} name="path" readOnly tabIndex={-1} className="pointer-events-none" />
        <Button type="submit" disabled={selected === null}>
          {props.cta}
        </Button>
      </Form>

      <FsEntrySelect entries={entries} selected={selected} onChange={onChange} />
    </div>
  );
}

function FsEntrySelect({
  entries,
  selected,
  onChange,
}: {
  entries: FsObjectType[];
  selected: FsObjectType | null;
  onChange: (entry: FsObjectType) => void;
}) {
  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-3 max-h-96 overflow-y-scroll bg-muted border p-2 rounded-sm">
      {entries.map((entry) => (
        <FsEntryItem
          key={entry.path}
          entry={entry}
          onClick={onChange}
          selected={selected !== null && selected.path === entry.path}
        />
      ))}
    </ul>
  );
}

function FsEntryItem({
  entry,
  onClick,
  selected,
  disabled,
}: {
  entry: FsObjectType;
  selected: boolean;
  disabled?: boolean;
  onClick: (entry: FsObjectType) => void;
}) {
  const Icon = entry.isDirectory ? Folder : FileCode;

  let classes: string;

  if (selected) {
    classes = 'cursor-pointer bg-muted-foreground';
  } else if (disabled) {
    classes = 'pointer-events-none';
  } else {
    classes = 'hover:bg-muted-foreground';
  }

  return (
    <li className="text-sm">
      <button
        className={cn('my-0.5 py-2 px-1 rounded w-full flex items-center cursor-pointer', classes)}
        disabled={disabled}
        onClick={() => onClick(entry)}
      >
        <Icon size={16} />
        <span className="ml-1.5 truncate">{entry.basename}</span>
      </button>
    </li>
  );
}

export function ExportLocationPicker(props: {
  title: string;
  onSave: (directory: string, path: string) => void;
}) {
  const filenameRef = useRef<HTMLInputElement | null>(null);
  function toValidFilename(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  const [filename, setFilename] = useState(toValidFilename(props.title) + '.src.md');
  const [fsResult, setFsResult] = useState<FsObjectResultType>({ dirname: '', entries: [] });

  function onDiskResponse({ result }: DiskResponseType) {
    setFsResult(result);
  }

  useEffectOnce(() => {
    disk().then(onDiskResponse);

    const el = filenameRef.current;
    if (el) {
      setTimeout(() => el.setSelectionRange(0, el.value.length - '.src.md'.length), 5);
    }
  });

  const validFilename = /.+\.src\.md$/.test(filename);

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-1.5">
        <Input
          ref={filenameRef}
          className="mb-2"
          defaultValue={filename}
          onChange={(e) => setFilename(e.currentTarget.value.trimEnd())}
        />
      </div>

      <FsEntrySelect
        entries={fsResult.entries}
        selected={null}
        onChange={(entry) => {
          if (entry.isDirectory) {
            disk({ dirname: entry.path }).then(onDiskResponse);
          } else {
            setFilename(entry.basename);
            const el = filenameRef.current;
            if (el) {
              el.value = entry.basename;
            }
          }
        }}
      />

      <div className="flex items-center justify-between">
        <div className="text-sm">
          {fsResult.dirname}/<span className="font-bold">{filename}</span>
        </div>
        <Button
          tabIndex={2}
          variant="default"
          disabled={!validFilename}
          onClick={() => props.onSave(fsResult.dirname, filename)}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
