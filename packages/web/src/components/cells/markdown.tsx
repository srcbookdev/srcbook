import { useEffect, useState } from 'react';
import { marked } from 'marked';
import mermaid from 'mermaid';
import Markdown from 'marked-react';
import CodeMirror, { keymap, Prec, EditorView } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

import { CircleAlert, Trash2, Pencil, Sparkles, LoaderCircle } from 'lucide-react';
import {
  AiGeneratedCellPayloadType,
  CellType,
  MarkdownCellType,
  MarkdownCellUpdateAttrsType,
} from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { EditorState } from '@codemirror/state';
import { Button } from '@/components/ui/button';
import { unifiedMergeView } from '@codemirror/merge';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';
import useTheme from '@/components/use-theme';
import { useCells } from '../use-cell';
import { useSettings } from '@/components/use-settings';

import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { AiPromptInput } from '../ai-prompt-input';
import { SessionChannel } from '../../clients/websocket';
import { SessionType } from '../../types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const DEBOUNCE_DELAY = 500;
type CellModeType = 'off' | 'generating' | 'reviewing' | 'prompting';

marked.use({ gfm: true });

const MERMAID_LIGHT_OVERRIDES = {
  background: '#FFFFFF', // bg-background // Other colors (eg line color) are derived from this
  primaryColor: '#FBFCFD', // bg-muted
  primaryBorderColor: '#D8DBDD', // bg-border
  primaryTextColor: '#38464F', // text-foreground
};

const MERMAID_DARK_OVERRIDES = {
  background: '#20282D', // bg-background // Other colors (eg line color) are derived from this
  primaryColor: '#293239', // bg-muted
  primaryBorderColor: '#38464F', // bg-border
  primaryTextColor: '#FFFFFF', // text-foreground
};

const markdownRenderer = {
  code(snippet: React.ReactNode, lang: string) {
    if (lang === 'mermaid') {
      return (
        <pre className="mermaid !bg-background" key="mermaid">
          {snippet}
        </pre>
      );
    }

    return (
      <pre key="code">
        <code>{snippet}</code>
      </pre>
    );
  },
};

function getValidationError(text: string) {
  const tokens = marked.lexer(text);
  const hasH1 = tokens?.some((token) => token.type === 'heading' && token.depth === 1);
  const hasH6 = tokens?.some((token) => token.type === 'heading' && token.depth === 6);

  if (hasH1 || hasH6) {
    return 'Markdown cells cannot use h1 or h6 headings, these are reserved for srcbook.';
  }

  return null;
}

export default function MarkdownCell(props: {
  session: SessionType;
  channel: SessionChannel;
  cell: MarkdownCellType;
  updateCellOnServer: (cell: MarkdownCellType, attrs: MarkdownCellUpdateAttrsType) => void;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { codeTheme, theme } = useTheme();
  const { updateCell: updateCellOnClient } = useCells();
  const { cell, updateCellOnServer, onDeleteCell, channel, session } = props;
  const defaultState = cell.text ? 'view' : 'edit';
  const [status, setStatus] = useState<'edit' | 'view'>(defaultState);
  const [text, setText] = useState(cell.text);
  const [error, setError] = useState<string | null>(null);
  const [cellMode, setCellMode] = useState<CellModeType>('off');
  const [prompt, setPrompt] = useState<string>('');
  const [newText, setNewText] = useState<string>('');
  const { aiEnabled } = useSettings();

  useHotkeys(
    'mod+enter',
    () => {
      if (!prompt) return;
      if (cellMode !== 'prompting') return;
      if (!aiEnabled) return;
      generate();
    },
    { enableOnFormTags: ['textarea'] },
  );

  useHotkeys(
    'escape',
    () => {
      if (cellMode === 'prompting') {
        setCellMode('off');
        setPrompt('');
      }
    },
    { enableOnFormTags: ['textarea'] },
  );
  useEffect(() => {
    if (status === 'edit') {
      setText(cell.text);
    }
  }, [status, cell.text]);

  // Initializes mermaid and updates it on theme change
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      fontFamily: 'IBM Plex Sans',
      darkMode: theme === 'dark',
      themeVariables: theme === 'dark' ? MERMAID_DARK_OVERRIDES : MERMAID_LIGHT_OVERRIDES,
    });
  }, [theme]);

  // Rerenders mermaid diagrams when the cell is in view mode
  useEffect(() => {
    if (status === 'view') {
      mermaid.run();
    }
  }, [status]);

  const keyMap = Prec.highest(
    keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          onSave();
          return true;
        },
      },
      {
        key: 'Escape',
        run: () => {
          setStatus('view');
          return true;
        },
      },
    ]),
  );

  useEffect(() => {
    function callback(payload: AiGeneratedCellPayloadType) {
      if (payload.cellId !== cell.id) return;
      setNewText(payload.output);
      setCellMode('reviewing');
    }
    channel.on('ai:generated', callback);
    return () => channel.off('ai:generated', callback);
  }, [cell.id, channel]);

  const updateCellOnServerDebounced = useDebouncedCallback(updateCellOnServer, DEBOUNCE_DELAY);

  function onSave() {
    const error = getValidationError(newText);
    setError(error);

    if (error === null) {
      updateCellOnClient({ ...cell, text: newText });
      updateCellOnServerDebounced(cell, { text: newText });
      setStatus('view');
      return true;
    }
  }

  function generate() {
    channel.push('ai:generate', {
      sessionId: session.id,
      cellId: cell.id,
      prompt,
    });
    setCellMode('generating');
  }

  function onAcceptDiff() {
    onSave();
    setPrompt('');
    setCellMode('off');
  }

  function onRevertDiff() {
    setCellMode('prompting');
    setNewText('');
  }

  function onCancel() {
    setStatus('view');
    setError(null);
  }
  function DiffEditor({ original, modified }: { original: string; modified: string }) {
    const { codeTheme } = useTheme();

    return (
      <div className="flex flex-col">
        <CodeMirror
          value={modified}
          theme={codeTheme}
          extensions={[
            markdown(),
            EditorView.editable.of(false),
            EditorState.readOnly.of(true),
            unifiedMergeView({
              original: original,
              mergeControls: false,
              highlightChanges: false,
            }),
          ]}
        />
      </div>
    );
  }

  return (
    <div
      id={`cell-${cell.id}`}
      onDoubleClick={() => setStatus('edit')}
      className={cn(
        'group/cell relative w-full rounded-md border border-transparent hover:border-border transition-all',
        status === 'edit' && 'ring-1 ring-ring border-ring hover:border-ring',
        error && 'ring-1 ring-sb-red-30 border-sb-red-30 hover:border-sb-red-30',
      )}
    >
      <div
        className={cn(
          'p-1 w-full flex items-center justify-between z-10',
          status === 'view' ? 'hidden group-hover/cell:flex' : '',
        )}
      >
        <div className="flex items-center gap-2">
          <h5 className="pl-2 text-sm font-mono font-bold">Markdown</h5>
          <DeleteCellWithConfirmation onDeleteCell={() => onDeleteCell(cell)}>
            <Button variant="secondary" size="icon" className="border-transparent">
              <Trash2 size={16} />
            </Button>
          </DeleteCellWithConfirmation>
        </div>
        <div className="flex items-center gap-1">
          {status === 'view' && (
            <Button
              variant="secondary"
              size="icon"
              className="border-transparent"
              onClick={() => setStatus('edit')}
            >
              <Pencil size={16} />
            </Button>
          )}
          {status === 'edit' && cellMode === 'off' && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="icon"
                      size="icon"
                      disabled={cellMode !== 'off'}
                      onClick={() => setCellMode('prompting')}
                    >
                      <Sparkles size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit cell using AI</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={onSave}>Save</Button>
            </>
          )}
          {cellMode === 'prompting' && (
            <Button variant="default" onClick={generate} disabled={!aiEnabled}>
              Generate
            </Button>
          )}
          {cellMode === 'generating' && (
            <Button variant="ai" size="default-with-icon" className="disabled:opacity-100" disabled>
              <LoaderCircle size={16} className="animate-spin" /> Generating
            </Button>
          )}
          {cellMode === 'reviewing' && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onRevertDiff}>
                Revert
              </Button>
              <Button onClick={onAcceptDiff}>Accept</Button>
            </div>
          )}
        </div>
      </div>
      {cellMode === 'reviewing' && <DiffEditor original={cell.text} modified={newText} />}

      {['prompting', 'generating'].includes(cellMode) && (
        <AiPromptInput
          prompt={prompt}
          setPrompt={setPrompt}
          onClose={() => setCellMode('off')}
          aiEnabled={aiEnabled}
        />
      )}

      {status === 'view' ? (
        <div>
          <div className="sb-prose px-3 pt-10 group-hover/cell:pt-0">
            <Markdown renderer={markdownRenderer}>{cell.text}</Markdown>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
              <CircleAlert size={16} />
              <p className="text-xs">{error}</p>
            </div>
          )}
          <div className="px-3">
            <CodeMirror
              theme={codeTheme}
              indentWithTab={false}
              value={text}
              basicSetup={{ lineNumbers: false, foldGutter: false }}
              extensions={[markdown(), keyMap, EditorView.lineWrapping]}
              onChange={(newText) => {
                setNewText(newText);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
