import { Button, cn, ScrollArea } from '@srcbook/components';
import { Markdown } from '../components/markdown';
import { diffFiles } from './apps/lib/diff.js';
import TextareaAutosize from 'react-textarea-autosize';
import { ArrowUp, X, Paperclip, History, LoaderCircle } from 'lucide-react';
import * as React from 'react';
import { aiEditApp } from '@/clients/http/apps.js';
import { AppType } from '@srcbook/shared';
import { useFiles } from './apps/use-files';
import type { FileType, FileDiffType } from './apps/types.js';
import { DiffStats } from './apps/diff-stats.js';

type UserMessageType = {
  type: 'user';
  message: string;
};

type CommandMessageType = {
  type: 'command';
  command: string;
  description: string;
};

type DiffMessageType = {
  type: 'diff';
  diff: FileDiffType[];
};

type PlanMessageType = {
  type: 'plan';
  content: string;
};

type MessageType = UserMessageType | DiffMessageType | CommandMessageType | PlanMessageType;

type HistoryType = Array<MessageType>;

function Chat({
  history,
  isLoading,
  onClose,
  app,
  fileDiffs,
  revertDiff,
  openDiffModal,
}: {
  history: HistoryType;
  isLoading: boolean;
  onClose: () => void;
  app: AppType;
  fileDiffs: FileDiffType[];
  revertDiff: () => void;
  openDiffModal: () => void;
}) {
  return (
    <div className="rounded-xl bg-background w-[440px] border shadow-xl max-h-[75vh] overflow-y-hidden">
      <div className="flex justify-between h-[40px] items-center border-b px-1">
        <span className="text-sm px-2">Chat</span>
        <span className="flex items-center">
          <Button variant="icon" className="h-7 w-7 p-1.5 border-none">
            <History size={18} className="text-sb-core-80" />
          </Button>
          <Button variant="icon" className="h-7 w-7 p-1.5 border-none" onClick={onClose}>
            <X size={18} className="text-sb-core-80" />
          </Button>
        </span>
      </div>
      <ScrollArea className="max-h-[calc(75vh-40px)] overflow-y-auto p-2">
        <div className="flex flex-col gap-2">
          {/* TODO: each message object needs a unique identifier */}
          {history.map((message: MessageType, index: number) => {
            if (message.type === 'user') {
              return (
                <p className="text-sm bg-inline-code rounded-md p-2 w-fit" key={index}>
                  {message.message}
                </p>
              );
            } else if (message.type === 'command') {
              return (
                <div className="text-sm space-y-1" key={index}>
                  <p>{message.description}</p>
                  <div className="flex justify-between items-center gap-1">
                    <p className="font-mono bg-inline-code rounded-md p-2 overflow-x-scroll whitespace-nowrap">
                      {message.command}
                    </p>
                    <Button onClick={() => alert('TODO: run command' + message.command)}>
                      Run
                    </Button>
                  </div>
                </div>
              );
            } else if (message.type === 'plan') {
              return <Markdown key={index}>{message.content}</Markdown>;
            } else if (message.type === 'diff') {
              return <DiffBox key={index} files={message.diff} app={app} />;
            }
          })}
          <div className={cn('flex gap-2 w-full', fileDiffs.length > 0 ? '' : 'hidden')}>
            <Button variant="ai-secondary" onClick={revertDiff} className="flex-1">
              Undo
            </Button>
            <Button variant="ai" onClick={openDiffModal} className="flex-1">
              Review changes
            </Button>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm">
              <p>Loading...</p>
              <LoaderCircle size={18} className="animate-spin" />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Query({
  onSubmit,
  onFocus,
  isLoading,
}: {
  onSubmit: (query: string) => Promise<void>;
  onFocus: () => void;
  isLoading: boolean;
}) {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery('');
    onSubmit(query);
  };

  return (
    <div className="rounded-xl bg-background w-[440px] border px-2 py-1 hover:border-sb-purple-60 shadow-xl">
      <TextareaAutosize
        disabled={isLoading}
        placeholder="What do you want to change?"
        className="flex w-full rounded-sm bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none resize-none"
        maxRows={20}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={onFocus}
        value={query}
        onKeyDown={(e) => {
          if (e.metaKey && e.key === 'Enter') {
            handleSubmit(e);
          }
        }}
      />
      <span className="flex items-center justify-end gap-2 mt-2">
        <Button variant="icon" className="h-7 w-7 p-1.5 border-none">
          <Paperclip size={18} />
        </Button>
        <Button
          variant="ai"
          className={'h-7 w-7 p-1.5 foxus:outline-none border-none'}
          onClick={handleSubmit}
          disabled={!query}
        >
          {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowUp size={18} />}
        </Button>
      </span>
    </div>
  );
}

function DiffBox({ files, app }: { files: FileDiffType[]; app: AppType }) {
  return (
    <div className="px-2 py-1.5 rounded border overflow-y-auto bg-ai border-ai-border text-ai-foreground">
      <div className="flex flex-col justify-between min-h-full gap-4">
        <div className="">{app.name}</div>
        <div>
          {files.map((file) => (
            <div key={file.path}>
              <div className="flex justify-between text-sm font-mono">
                <p className="font-mono">{file.path}</p>
                <DiffStats additions={file.additions} deletions={file.deletions} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type PropsType = {
  app: AppType;
  triggerDiffModal: (props: { files: FileDiffType[]; onUndoAll: () => void } | null) => void;
};

export function ChatPanel(props: PropsType): React.JSX.Element {
  const [history, setHistory] = React.useState<HistoryType>([]);
  const [fileDiffs, setFileDiffs] = React.useState<FileDiffType[]>([]);
  const [isChatVisible, setIsChatVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { createFile, deleteFile } = useFiles();

  const handleSubmit = async (query: string) => {
    setIsLoading(true);
    setHistory((prevHistory) => [...prevHistory, { type: 'user', message: query }]);
    setIsChatVisible(true);

    const { data: plan } = await aiEditApp(props.app.id, query);

    setHistory((prevHistory) => [...prevHistory, { type: 'plan', content: plan.description }]);

    const fileUpdates = plan.actions.filter((item) => item.type === 'file');
    const commandUpdates = plan.actions.filter((item) => item.type === 'command');

    const historyEntries = commandUpdates.map((update) => {
      const entry: CommandMessageType = {
        type: 'command',
        command: update.content,
        description: update.description,
      };
      return entry;
    });

    setHistory((prevHistory) => prevHistory.concat(historyEntries));

    for (const update of fileUpdates) {
      createFile(update.dirname, update.basename, update.modified);
    }

    const fileDiffs = fileUpdates.map((file: FileType) => {
      const { additions, deletions } = diffFiles(file.original ?? '', file.modified);
      return {
        modified: file.modified,
        original: file.original || '',
        basename: file.basename,
        dirname: file.dirname,
        path: file.path,
        additions,
        deletions,
        type: file.original ? 'edit' : ('create' as 'edit' | 'create'),
      };
    });

    setHistory((prevHistory) => [...prevHistory, { type: 'diff', diff: fileDiffs }]);
    setFileDiffs(fileDiffs);
    setIsLoading(false);
  };

  // TODO: this closes over state that might be stale.
  // This probably needs to use a ref for file diffs to
  // ensure the most recent state is always referenced.
  const revertDiff = () => {
    for (const file of fileDiffs) {
      if (file.original) {
        createFile(file.dirname, file.basename, file.original);
      } else {
        // TODO: this needs some testing, this shows the idea only
        deleteFile({ type: 'file', name: file.basename, path: file.path });
      }
    }
    setFileDiffs([]);
  };

  const handleClose = () => {
    setIsChatVisible(false);
  };

  const handleFocus = () => {
    if (history.length > 0) {
      setIsChatVisible(true);
    }
  };

  function openDiffModal() {
    props.triggerDiffModal({
      files: fileDiffs,
      onUndoAll: () => {
        revertDiff();
        props.triggerDiffModal(null);
      },
    });
  }

  return (
    <div className="fixed bottom-4 right-4 grid gap-1">
      {isChatVisible && (
        <Chat
          history={history}
          isLoading={isLoading}
          onClose={handleClose}
          app={props.app}
          revertDiff={revertDiff}
          fileDiffs={fileDiffs}
          openDiffModal={openDiffModal}
        />
      )}
      <Query onSubmit={handleSubmit} isLoading={isLoading} onFocus={handleFocus} />
    </div>
  );
}
