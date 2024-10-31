import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@srcbook/components';
import Markdown from './apps/markdown.js';
import { diffFiles } from './apps/lib/diff.js';
import TextareaAutosize from 'react-textarea-autosize';
import {
  ArrowUp,
  Minus,
  Paperclip,
  LoaderCircle,
  History,
  PanelTopOpen,
  Loader,
  ViewIcon,
  Undo2Icon,
  Redo2Icon,
  GripHorizontal,
  ThumbsUp,
  ThumbsDown,
  GitMerge,
  EllipsisVertical,
} from 'lucide-react';
import * as React from 'react';
import {
  aiEditApp,
  loadHistory,
  appendToHistory,
  aiGenerationFeedback,
} from '@/clients/http/apps.js';
import { AppType, randomid } from '@srcbook/shared';
import { useFiles } from './apps/use-files';
import { type FileType } from './apps/types';
import type {
  FileDiffType,
  UserMessageType,
  MessageType,
  HistoryType,
  CommandMessageType,
  PlanMessageType,
  DiffMessageType,
} from '@srcbook/shared';
import { DiffStats } from './apps/diff-stats.js';
import { useApp } from './apps/use-app.js';
import { usePackageJson } from './apps/use-package-json.js';
import { AiFeedbackModal } from './apps/AiFeedbackModal';
import { useVersion } from './apps/use-version.js';
import { Link } from 'react-router-dom';

function Chat({
  history,
  loading,
  onClose,
  app,
  fileDiffs,
  diffApplied,
  revertDiff,
  reApplyDiff,
  openDiffModal,
}: {
  history: HistoryType;
  loading: 'description' | 'actions' | null;
  onClose: () => void;
  app: AppType;
  fileDiffs: FileDiffType[];
  diffApplied: boolean;
  revertDiff: () => void;
  reApplyDiff: () => void;
  openDiffModal: () => void;
}) {
  const { npmInstall } = usePackageJson();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Tried scrolling with flex-direction: column-reverse but it didn't work
  // with generated content, so fallback to using JS
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [history, loading]);

  return (
    <div className="rounded-lg bg-background w-[440px] border shadow-xl max-h-[75vh]">
      <div className="flex justify-between h-[40px] items-center border-b px-1">
        <span className="text-sm px-2">Chat</span>
        <span className="flex items-center">
          <Button variant="icon" className="h-7 w-7 p-1.5 border-none" onClick={onClose}>
            <Minus size={18} className="text-sb-core-80" />
          </Button>
        </span>
      </div>
      <div className="max-h-[calc(75vh-40px)] p-2 overflow-y-auto">
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
              const packages = message.packages;
              if (!packages) {
                console.error(
                  'The only supported command is `npm install <packages>`. Got:',
                  message.command,
                );
                return;
              }
              return (
                <div className="text-sm space-y-1" key={index}>
                  <p>Install dependencies</p>
                  <div className="flex justify-between items-center gap-1">
                    <p className="font-mono bg-inline-code rounded-md p-2 overflow-x-scroll whitespace-nowrap flex-grow">
                      {`npm install ${packages.join(' ')}`}
                    </p>
                    <Button onClick={() => npmInstall(packages)}>Run</Button>
                  </div>
                </div>
              );
            } else if (message.type === 'plan') {
              return <Markdown key={index} source={message.content.trim()} />;
            } else if (message.type === 'diff') {
              // Calculate the incremental version, i.e. v1 for the first diffbox, v2 for the second, etc.
              // This is separate from the git version number.
              const diffs = history.filter((m) => m.type === 'diff');
              const currentDiffIndex = diffs.findIndex((m) => m === message);
              const incrementalVersion = currentDiffIndex + 1;

              return (
                <DiffBox
                  key={index}
                  files={message.diff}
                  app={app}
                  version={message.version}
                  planId={message.planId}
                  incrementalVersion={incrementalVersion}
                />
              );
            }
          })}

          <div className={cn('flex gap-2 w-full px-2', fileDiffs.length > 0 ? '' : 'hidden')}>
            <Button
              variant="ai-secondary"
              onClick={diffApplied ? revertDiff : reApplyDiff}
              className="flex-1 flex items-center gap-1.5"
            >
              {diffApplied ? <Undo2Icon size={16} /> : <Redo2Icon size={16} />}
              <span>{diffApplied ? 'Undo' : 'Re-apply'}</span>
            </Button>
            <Button
              variant="ai"
              onClick={openDiffModal}
              className="flex-1 flex items-center gap-1.5"
            >
              <ViewIcon size={16} />
              <span>Review changes</span>
            </Button>
          </div>

          {loading !== null && (
            <div className="flex items-center gap-2 text-sm pt-3">
              <Loader size={18} className="animate-spin text-ai-btn" />{' '}
              <p className="text-xs">
                {loading === 'description'
                  ? 'Generating plan...'
                  : 'Applying changes (this can take a while)...'}
              </p>
            </div>
          )}
          {/* empty div for scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

function Query({
  onSubmit,
  onFocus,
  isLoading,
  isVisible,
  setVisible,
}: {
  onSubmit: (query: string) => Promise<void>;
  onFocus: () => void;
  isLoading: boolean;
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
}) {
  const [query, setQuery] = React.useState('');

  const handleSubmit = () => {
    const value = query.trim();
    if (value) {
      setQuery('');
      onSubmit(value);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg w-[440px] border p-2 shadow-xl transition-all',
        'bg-background hover:border-ai-ring focus-within:border-ai-ring',
        isLoading && 'hover:border-border',
      )}
    >
      <TextareaAutosize
        disabled={isLoading}
        placeholder="What do you want to change?"
        className="flex w-full rounded-sm bg-transparent px-2 mb-2 text-sm caret-ai-btn placeholder:text-muted-foreground focus-visible:outline-none resize-none"
        maxRows={20}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={onFocus}
        value={query}
        onKeyDown={(e) => {
          if (e.metaKey && !e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }
        }}
      />
      <span className="flex items-center justify-end gap-1.5 mt-2">
        <Button variant="icon" className="h-7 w-7 p-1.5 border-none text-tertiary-foreground">
          {isVisible ? (
            <PanelTopOpen size={18} onClick={() => setVisible(false)} />
          ) : (
            <History size={18} onClick={() => setVisible(true)} />
          )}
        </Button>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="icon" className="h-7 w-7 p-1.5 border-none text-tertiary-foreground">
                <Paperclip size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon!</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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

function DiffBox({
  files,
  app,
  incrementalVersion,
  version,
  planId,
}: {
  files: FileDiffType[];
  app: AppType;
  incrementalVersion: number;
  version: string;
  planId: string;
}) {
  const [showFeedbackToast, setShowFeedbackToast] = React.useState(false);
  const [feedbackGiven, _setFeedbackGiven] = React.useState<null | 'positive' | 'negative'>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState(false);

  const { checkout, currentVersion } = useVersion();

  const setFeedbackGiven = (feedback: 'positive' | 'negative') => {
    setShowFeedbackToast(true);
    _setFeedbackGiven(feedback);
    setTimeout(() => setShowFeedbackToast(false), 2500);
  };

  const handleFeedbackSubmit = (feedbackText: string) => {
    setFeedbackGiven('negative');
    aiGenerationFeedback(app.id, { planId, feedback: { type: 'negative', text: feedbackText } });
  };

  return (
    <>
      <div
        className={cn(
          'px-2 mx-2 pb-2 rounded border overflow-y-auto bg-ai border-ai-border text-ai-foreground transition-all',
          currentVersion?.sha === version ? 'border-ai-foreground' : 'border-ai-border',
        )}
      >
        <div className="flex flex-col justify-between min-h-full">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center text-sm h-10">
              <span className="font-medium">{app.name}</span>
              <span className="font-mono">V{incrementalVersion}</span>
            </div>
            {/* We don't need this guard if we assume only new apps */}
            {version && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <GitMerge size={16} />
                  <span className="font-mono text-sm">
                    #{version ? version.slice(0, 7) : 'unknown version'}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <EllipsisVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => checkout(version)}>
                      Revert to this version
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => alert('Coming soon!')}>
                      Fork this version
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <div>
            {files.map((file) => (
              <div key={file.path}>
                <div className="flex justify-between items-center text-sm font-mono h-8">
                  <Link to={`/apps/${app.id}/files/${encodeURIComponent(file.path)}`}>
                    <p className="font-mono hover:underline">{file.path}</p>
                  </Link>
                  <DiffStats additions={file.additions} deletions={file.deletions} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex px-2 items-center gap-2 my-2">
        <Button
          variant="icon"
          className={cn(
            'h-7 w-7 p-1.5 border-none',
            feedbackGiven === 'positive' ? 'text-secondary-foreground' : 'text-tertiary-foreground',
          )}
          aria-label="Upvote"
          onClick={() => {
            setFeedbackGiven('positive');
            aiGenerationFeedback(app.id, { planId, feedback: { type: 'positive' } });
          }}
        >
          <ThumbsUp size={18} />
        </Button>
        <Button
          variant="icon"
          className={cn(
            'h-7 w-7 p-1.5 border-none',
            feedbackGiven === 'negative' ? 'text-secondary-foreground' : 'text-tertiary-foreground',
          )}
          aria-label="Downvote"
          onClick={() => setIsFeedbackModalOpen(true)}
        >
          <ThumbsDown size={18} />
        </Button>
        {showFeedbackToast && (
          <p className="text-sm text-tertiary-foreground">Thanks for the feedback!</p>
        )}
      </div>
      <AiFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />
    </>
  );
}

export function DraggableChatPanel(props: { children: React.ReactNode }): React.JSX.Element {
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 20, y: 20 });
  const chatRef = React.useRef<HTMLDivElement>(null);
  const dragStartPos = React.useRef({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setShowOverlay(true);
      dragStartPos.current = {
        x: e.clientX + position.x,
        y: e.clientY + position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && chatRef.current) {
      const newX = dragStartPos.current.x - e.clientX;
      const newY = dragStartPos.current.y - e.clientY;

      // Ensure the chat panel stays within the viewport
      const maxX = window.innerWidth - chatRef.current.offsetWidth;
      const maxY = window.innerHeight - chatRef.current.offsetHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setShowOverlay(false);
  };

  React.useEffect(() => {
    if (showOverlay) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, showOverlay]);

  // Note: we show a full screen overlay otherwise the mouse events
  // don't fire correctly when hovering over the iframe.

  return (
    <>
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}
      {/* eslint-disable-next-line */}
      <div
        ref={chatRef}
        className="fixed"
        style={{
          bottom: `${position.y}px`,
          right: `${position.x}px`,
          userSelect: `${isDragging ? 'none' : 'auto'}`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-end gap-1">
          <GripHorizontal
            className={cn(
              'text-gray-400 drag-handle bg-background/10 rounded-sm',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
          />
          {props.children}
        </div>
      </div>
    </>
  );
}

type PropsType = {
  triggerDiffModal: (props: { files: FileDiffType[]; onUndoAll: () => void } | null) => void;
};

export function ChatPanel(props: PropsType): React.JSX.Element {
  const { app } = useApp();

  const [history, setHistory] = React.useState<HistoryType>([]);
  const [fileDiffs, setFileDiffs] = React.useState<FileDiffType[]>([]);
  const [visible, setVisible] = React.useState(false);
  const [loading, setLoading] = React.useState<'description' | 'actions' | null>(null);
  const [diffApplied, setDiffApplied] = React.useState(false);
  const { createFile, deleteFile } = useFiles();
  const { createVersion } = useVersion();

  // Initialize history from the DB
  React.useEffect(() => {
    loadHistory(app.id)
      .then(({ data }) => setHistory(data))
      .catch((error) => {
        console.error('Error fetching chat history:', error);
      });
  }, [app]);

  const handleSubmit = async (query: string) => {
    const planId = randomid();
    setLoading('description');
    setFileDiffs([]);
    const userMessage = { type: 'user', message: query, planId } as UserMessageType;
    setHistory((prevHistory) => [...prevHistory, userMessage]);
    appendToHistory(app.id, userMessage);
    setVisible(true);

    const iterable = await aiEditApp(app.id, query, planId);

    const fileUpdates: FileType[] = [];

    for await (const message of iterable) {
      if (message.type === 'description') {
        const planMessage = {
          type: 'plan',
          content: message.data.content,
          planId,
        } as PlanMessageType;
        setHistory((prevHistory) => [...prevHistory, planMessage]);
        appendToHistory(app.id, planMessage);
        setLoading('actions');
      } else if (message.type === 'action') {
        if (message.data.type === 'command') {
          const commandMessage = {
            type: 'command',
            command: message.data.command,
            packages: message.data.packages,
            description: message.data.description,
            planId,
          } as CommandMessageType;
          setHistory((prevHistory) => [...prevHistory, commandMessage]);
          appendToHistory(app.id, commandMessage);
        } else if (message.data.type === 'file') {
          fileUpdates.push(message.data);
        }
      } else {
        console.error('Unknown message type:', message);
      }
    }

    if (fileUpdates.length > 0) {
      // Write the changes
      for (const update of fileUpdates) {
        createFile(update.dirname, update.basename, update.modified);
      }

      // Create a new version
      const version = await createVersion(`Changes for planId: ${planId}`);

      const fileDiffs: FileDiffType[] = fileUpdates.map((file: FileType) => {
        const { additions, deletions } = diffFiles(file.original ?? '', file.modified);
        return {
          modified: file.modified,
          original: file.original,
          basename: file.basename,
          dirname: file.dirname,
          path: file.path,
          additions,
          deletions,
          type: file.original ? 'edit' : ('create' as 'edit' | 'create'),
        };
      });

      const diffMessage = { type: 'diff', diff: fileDiffs, planId, version } as DiffMessageType;
      setHistory((prevHistory) => [...prevHistory, diffMessage]);
      appendToHistory(app.id, diffMessage);

      setFileDiffs(fileDiffs);
      setDiffApplied(true);
    }
    setLoading(null);
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
        deleteFile({
          type: 'file',
          path: file.path,
          dirname: file.dirname,
          basename: file.basename,
        });
      }
    }
    setDiffApplied(false);
  };

  const reApplyDiff = () => {
    for (const file of fileDiffs) {
      createFile(file.dirname, file.basename, file.modified);
    }
    setDiffApplied(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  const handleFocus = () => {
    if (history.length > 0) {
      setVisible(true);
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
    <DraggableChatPanel>
      <div className="flex flex-col gap-2">
        {visible && (
          <Chat
            history={history}
            loading={loading}
            onClose={handleClose}
            app={app}
            diffApplied={diffApplied}
            reApplyDiff={reApplyDiff}
            revertDiff={revertDiff}
            fileDiffs={fileDiffs}
            openDiffModal={openDiffModal}
          />
        )}
        <Query
          onSubmit={handleSubmit}
          isLoading={loading !== null}
          onFocus={handleFocus}
          isVisible={visible}
          setVisible={setVisible}
        />
      </div>
    </DraggableChatPanel>
  );
}
