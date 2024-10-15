import { Button, ScrollArea } from '@srcbook/components';
import TextareaAutosize from 'react-textarea-autosize';
import { ArrowUp, X, Paperclip, History, LoaderCircle } from 'lucide-react';
import * as React from 'react';
import { aiEditApp } from '@/clients/http/apps.js';
import { AppType } from '@srcbook/shared';
import { useFiles } from './apps/use-files';

// TODO PUT THIS IN SHARED
type FileType = {
  basename: string;
  dirname: string;
  type: 'file';
  content: string;
  filename: string;
  description: string;
};

type CommandType = {
  type: 'command';
  content: string;
  description: string;
};

type PlanItemType = FileType | CommandType;

type PlanType = Array<PlanItemType>;

type UserMessageType = {
  type: 'user';
  message: string;
};

type CommandMessageType = {
  type: 'command';
  command: string;
  description: string;
};

type SummaryMessageType = {
  type: 'summary';
  summary: PlanType;
};

type MessageType = UserMessageType | SummaryMessageType | CommandMessageType;

type HistoryType = Array<MessageType>;

type PropsType = {
  app: AppType;
};

function Chat({
  history,
  onClose,
  app,
}: {
  history: HistoryType;
  onClose: () => void;
  app: AppType;
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
                    <Button onClick={() => console.log('run command', message.command)}>Run</Button>
                  </div>
                </div>
              );
            } else if (message.type === 'summary') {
              return <SummaryBox key={index} summary={message.summary} app={app} />;
            }
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function Query({
  onSubmit,
  onFocus,
}: {
  onSubmit: (query: string) => Promise<void>;
  onFocus: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const first = false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(query);
    setQuery('');
    setIsLoading(false);
  };

  return (
    <div className="rounded-xl bg-background w-[440px] border px-2 py-1 hover:border-sb-purple-60 shadow-xl">
      <TextareaAutosize
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

function SummaryBox({ summary, app }: { summary: PlanType; app: AppType }) {
  return (
    <div className="px-2 py-1.5 rounded border overflow-y-auto bg-ai border border-ai-border text-ai-foreground">
      <div className="flex flex-col justify-between min-h-full gap-4">
        <div className="">{app.name}</div>
        <div>
          {summary.map((item: PlanItemType) => {
            if (item.type === 'file') {
              return (
                <p key={item.basename}>
                  <span className="text-sm font-mono">{item.filename}</span>:{' '}
                  <span className="text-sm opacity-60 line-clamp-1">{item.description}</span>
                </p>
              );
            } else if (item.type === 'command') {
              return (
                <div key={item.content}>
                  <p className="text-sm font-mono">
                    Run command: <span className="font-mono">{item.content}</span>
                  </p>
                  <p className="text-xs opacity-50">{item.description}</p>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}

export function ChatPanel(props: PropsType): React.JSX.Element {
  const [history, setHistory] = React.useState<HistoryType>([]);
  const [isChatVisible, setIsChatVisible] = React.useState(false);
  const { createFile } = useFiles();

  const handleSubmit = async (query: string) => {
    setHistory((prevHistory) => [...prevHistory, { type: 'user', message: query }]);
    setIsChatVisible(true);

    const response = await aiEditApp(props.app.id, query);

    const plan = response.data as Array<PlanItemType>;
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(async (fileUpdate: PlanItemType) => {
        if (fileUpdate.type === 'file') {
          await createFile(fileUpdate.dirname, fileUpdate.basename, fileUpdate.content);
        } else if (fileUpdate.type === 'command') {
          setHistory((prevHistory) => [
            ...prevHistory,
            { type: 'command', command: fileUpdate.content, description: fileUpdate.description },
          ]);
        }
      });
    }

    const fileUpdates = plan.filter((item: PlanItemType) => item.type === 'file');
    setHistory((prevHistory) => [...prevHistory, { type: 'summary', summary: fileUpdates }]);
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
      {isChatVisible && <Chat history={history} onClose={handleClose} app={props.app} />}
      <Query onSubmit={handleSubmit} onFocus={handleFocus} />
    </div>
  );
}
