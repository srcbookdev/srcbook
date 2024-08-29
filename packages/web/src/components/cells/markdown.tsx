import { useEffect, useState } from 'react';
import { marked } from 'marked';
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
import { stat } from 'fs';

const DEBOUNCE_DELAY = 500;
type CellModeType = 'off' | 'generating' | 'reviewing' | 'prompting';

marked.use({ gfm: true });

export default function MarkdownCell(props: {
  session: SessionType;
  channel: SessionChannel;
  cell: MarkdownCellType;
  updateCellOnServer: (cell: MarkdownCellType, attrs: MarkdownCellUpdateAttrsType) => void;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { codeTheme } = useTheme();
  const { updateCell: updateCellOnClient } = useCells();
  const { cell, updateCellOnServer, onDeleteCell, channel, session } = props;
  const defaultState = cell.text ? 'view' : 'edit';
  const [status, setStatus] = useState<'edit' | 'view'>(defaultState);
  const [text, setText] = useState(cell.text);
  const [error, setError] = useState<string | null>(null);
  const [cellMode, setCellMode] = useState<CellModeType>('off');
  const [prompt, setPrompt] = useState('');
  const [newText, setnewText] = useState('');
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
      // We move to the "review" stage of the generation process:
      console.log('payload', payload);
      setnewText(payload.output);
      setCellMode('reviewing');
    }
    channel.on('ai:generated', callback);
    return () => channel.off('ai:generated', callback);
  }, [cell.id, channel]);

  const updateCellOnServerDebounced = useDebouncedCallback(updateCellOnServer, DEBOUNCE_DELAY);

  function getValidationError(text: string) {
    const tokens = marked.lexer(text);
    const hasH1 = tokens?.some((token) => token.type === 'heading' && token.depth === 1);
    const hasH6 = tokens?.some((token) => token.type === 'heading' && token.depth === 6);

    if (hasH1 || hasH6) {
      return 'Markdown cells cannot use h1 or h6 headings, these are reserved for srcbook.';
    }

    return null;
  }

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
    setText(newText);
    updateCellOnClient({ ...cell, text: newText });
    updateCellOnServerDebounced(cell, { text: newText });
    setPrompt('');
    onSave();
    setCellMode('off');
  }

  function onRevertDiff() {
    setCellMode('prompting');
    setnewText('');
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
        className={cn('p-1 w-full hidden group-hover/cell:flex items-center justify-between z-10')}
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
              <Button variant="secondary" onClick={() => setStatus('view')}>
                Cancel
              </Button>
              <Button onClick={onSave}>Save</Button>
              <Button
                variant="icon"
                size="icon"
                disabled={cellMode !== 'off'}
                onClick={() => setCellMode('prompting')}
              >
                <Sparkles size={16} />
              </Button>
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
        <div className="sb-prose px-3 pt-10 group-hover/cell:pt-0">
          <Markdown>{cell.text}</Markdown>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 absolute bottom-1 right-1 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
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
                setnewText(newText);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
