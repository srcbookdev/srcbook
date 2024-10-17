import { useEffect, useState } from 'react';
import { marked } from 'marked';
import mermaid from 'mermaid';
import Markdown from 'marked-react';
import CodeMirror, { keymap, Prec, EditorView } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { CircleAlert, Trash2, Pencil } from 'lucide-react';
import { CellType, MarkdownCellType, MarkdownCellUpdateAttrsType } from '@srcbook/shared';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/button.js';
import DeleteCellWithConfirmation from '../delete-cell-dialog.js';
import useTheme from '../use-theme.js';

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
        <pre className="mermaid !bg-background" key={String(snippet)}>
          {snippet}
        </pre>
      );
    }

    return (
      <pre key={String(snippet)}>
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

type MarkdownCellProps =
  | { readOnly: true; cell: MarkdownCellType }
  | {
      readOnly?: false;
      cell: MarkdownCellType;
      updateCellOnClient: (cell: MarkdownCellType) => void;
      updateCellOnServer: (cell: MarkdownCellType, attrs: MarkdownCellUpdateAttrsType) => void;
      onDeleteCell: (cell: CellType) => void;
    };

export default function MarkdownCell(props: MarkdownCellProps) {
  const { codeTheme, theme } = useTheme();
  const { readOnly, cell } = props;
  const defaultState = cell.text ? 'view' : 'edit';
  const [status, setStatus] = useState<'edit' | 'view'>(defaultState);
  const [text, setText] = useState(cell.text);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'edit') {
      setText(cell.text);
    }
  }, [status, cell.text]);

  // Initializes mermaid and updates it on theme change
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      fontFamily: 'Instrument Sans',
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
    keymap.of(
      !readOnly
        ? [
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
          ]
        : [],
    ),
  );

  function onSave() {
    if (readOnly) {
      return;
    }
    const error = getValidationError(text);

    setError(error);

    if (error === null) {
      props.updateCellOnClient({ ...cell, text });
      props.updateCellOnServer(cell, { text });
      setStatus('view');
      return true;
    }
  }

  const deleteButton = !readOnly ? (
    <DeleteCellWithConfirmation onDeleteCell={() => props.onDeleteCell(cell)}>
      <Button variant="secondary" size="icon" className="border-transparent">
        <Trash2 size={16} />
      </Button>
    </DeleteCellWithConfirmation>
  ) : null;

  return (
    <div
      id={`cell-${cell.id}`}
      onDoubleClick={() => {
        if (readOnly) {
          return;
        }
        setStatus('edit');
      }}
      className={cn(
        'group/cell relative w-full rounded-md border border-transparent hover:border-border transition-all',
        status === 'edit' && 'ring-1 ring-ring border-ring hover:border-ring',
        error && 'ring-1 ring-sb-red-30 border-sb-red-30 hover:border-sb-red-30',
      )}
    >
      {status === 'view' ? (
        <div className="flex flex-col">
          <div className="p-1 w-full h-10 hidden group-hover/cell:flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <h5 className="pl-2 text-sm font-mono font-bold">Markdown</h5>
              {deleteButton}
            </div>
            <div className="flex items-center gap-1">
              {!readOnly ? (
                <Button
                  variant="secondary"
                  size="icon"
                  className="border-transparent"
                  onClick={() => setStatus('edit')}
                >
                  <Pencil size={16} />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="sb-prose p-3 group-hover/cell:pt-0">
            <Markdown renderer={markdownRenderer}>{cell.text}</Markdown>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 absolute bottom-1 right-1 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
              <CircleAlert size={16} />
              <p className="text-xs">{error}</p>
            </div>
          )}
          <div className="flex flex-col">
            <div className="p-1 w-full flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <h5 className="pl-2 text-sm font-mono font-bold">Markdown</h5>
                {deleteButton}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="secondary" onClick={() => setStatus('view')}>
                  Cancel
                </Button>

                <Button onClick={onSave}>Save</Button>
              </div>
            </div>

            <div className="px-3">
              <CodeMirror
                theme={codeTheme}
                indentWithTab={false}
                value={text}
                basicSetup={{ lineNumbers: false, foldGutter: false }}
                extensions={[markdown(), keyMap, EditorView.lineWrapping]}
                onChange={setText}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
