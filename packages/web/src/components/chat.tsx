import { Button, cn, ScrollArea } from '@srcbook/components';
import { diffFiles } from './apps/lib/diff.js';
import TextareaAutosize from 'react-textarea-autosize';
import { ArrowUp, X, Paperclip, History, LoaderCircle } from 'lucide-react';
import * as React from 'react';
import { aiEditApp } from '@/clients/http/apps.js';
import { AppType } from '@srcbook/shared';
import { useFiles } from './apps/use-files';
import type { FileType, PlanItemType, DiffType, FileDiffType } from './apps/types.js';

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
  diff: DiffType;
};

type MessageType = UserMessageType | DiffMessageType | CommandMessageType;

type HistoryType = Array<MessageType>;

type PropsType = {
  app: AppType;
};

function Chat({
  history,
  isLoading,
  onClose,
  app,
  diff,
  revertDiff,
}: {
  history: HistoryType;
  isLoading: boolean;
  onClose: () => void;
  app: AppType;
  diff: DiffType;
  revertDiff: () => Promise<void>;
}) {
  return (
    <div className="rounded-xl bg-background w-[440px] border shadow-xl max-h-[75vh] overflow-y-hidden">
      <div className="flex justify-between h-[40px] items-center border-b px-1">
        <span className="text-sm px-2">Chat</span>
        <span className="flex">
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
          {history.map((message: MessageType, index: number) => {
            if (message.type === 'user') {
              return (
                <p className="text-sm bg-inline-code rounded-md p-2 w-fit" key={index}>
                  {message.message}
                </p>
              );
            } else if (message.type === 'command') {
              return (
                <div className="text-sm space-y-1">
                  <p className="">{message.description}</p>
                  <div className="flex justify-between items-center gap-1">
                    <p
                      className="font-mono bg-inline-code rounded-md p-2 overflow-x-scroll whitespace-nowrap"
                      key={index}
                    >
                      {message.command}
                    </p>
                    <Button onClick={() => alert('TODO: run command' + message.command)}>
                      Run
                    </Button>
                  </div>
                </div>
              );
            } else if (message.type === 'diff') {
              return <DiffBox key={index} diff={message.diff} app={app} />;
            }
          })}
          <div className={cn('flex gap-2 w-full', diff.length > 0 ? '' : 'hidden')}>
            <Button variant="ai-secondary" onClick={revertDiff} className="flex-1">
              Undo
            </Button>
            <Button variant="ai" onClick={() => alert('TODO: view diff')} className="flex-1">
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
  const first = false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuery('');
    await onSubmit(query);
  };

  return (
    <div className="rounded-xl bg-background w-[440px] border px-2 py-1 hover:border-sb-purple-60 shadow-xl">
      <TextareaAutosize
        disabled={isLoading}
        placeholder={first ? 'Ask anything or select ...' : 'Ask a follow up'}
        className="flex w-full rounded-sm bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none resize-none"
        maxRows={20}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={onFocus}
        value={query}
      />
      <span className="flex justify-end mt-2">
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

function DiffBox({ diff, app }: { diff: DiffType; app: AppType }) {
  return (
    <div className="px-2 py-1.5 rounded border overflow-y-auto bg-ai border border-ai-border text-ai-foreground">
      <div className="flex flex-col justify-between min-h-full gap-4">
        <div className="">{app.name}</div>
        <div>
          {diff.map((item: FileDiffType) => {
            return (
              <div>
                <div className="flex justify-between text-sm font-mono">
                  <p className="font-mono" key={item.basename}>
                    {item.path}
                  </p>
                  <div className="flex gap-2">
                    <p className="text-green-400">-{item.deletions}</p>
                    <p className="text-red-400">+{item.additions}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ChatPanel(props: PropsType): React.JSX.Element {
  const [history, setHistory] = React.useState<HistoryType>([]);
  const [diff, setDiff] = React.useState<DiffType>([]);
  const [isChatVisible, setIsChatVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { createFile, deleteFile } = useFiles();

  const handleSubmit = async (query: string) => {
    setIsLoading(true);
    setHistory((prevHistory) => [...prevHistory, { type: 'user', message: query }]);
    setIsChatVisible(true);

    const response = await aiEditApp(props.app.id, query);

    const plan = response.data as Array<PlanItemType>;
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(async (fileUpdate: PlanItemType) => {
        if (fileUpdate.type === 'file') {
          await createFile(fileUpdate.dirname, fileUpdate.basename, fileUpdate.modified);
        } else if (fileUpdate.type === 'command') {
          setHistory((prevHistory) => [
            ...prevHistory,
            { type: 'command', command: fileUpdate.content, description: fileUpdate.description },
          ]);
        }
      });
    }

    const fileUpdates = plan.filter((item: PlanItemType) => item.type === 'file');

    const fileDiffs = fileUpdates.map((file: FileType) => {
      const { additions, deletions } = diffFiles(file.modified, file.original || '');

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
    setDiff(fileDiffs);
    setIsLoading(false);
  };

  const revertDiff = async () => {
    for (const file of diff) {
      if (file.original) {
        await createFile(file.dirname, file.basename, file.original);
      } else {
        // TODO: this needs some testing, this shows the idea only
        await deleteFile({ type: 'file', name: file.basename, path: file.path });
      }
    }
    setDiff([]);
  };

  const handleClose = () => {
    setIsChatVisible(false);
  };

  const handleFocus = () => {
    if (history.length > 0) {
      setIsChatVisible(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 grid gap-1">
      {isChatVisible && (
        <Chat
          history={history}
          isLoading={isLoading}
          onClose={handleClose}
          app={props.app}
          revertDiff={revertDiff}
          diff={diff}
        />
      )}
      <Query onSubmit={handleSubmit} isLoading={isLoading} onFocus={handleFocus} />
    </div>
  );
}
