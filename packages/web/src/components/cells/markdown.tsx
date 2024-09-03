import { useEffect, useState } from 'react';
import { marked } from 'marked';
import Markdown from 'marked-react';
import CodeMirror, { keymap, Prec, EditorView } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { CircleAlert, Trash2, Pencil } from 'lucide-react';
import type { CellType, MarkdownCellType, MarkdownCellUpdateAttrsType } from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';
import useTheme from '@/components/use-theme';
import { useCells } from '../use-cell';

marked.use({ gfm: true });

export default function MarkdownCell(props: {
  cell: MarkdownCellType;
  updateCellOnServer: (cell: MarkdownCellType, attrs: MarkdownCellUpdateAttrsType) => void;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { codeTheme } = useTheme();
  const { updateCell: updateCellOnClient } = useCells();
  const { cell, updateCellOnServer, onDeleteCell } = props;
  const defaultState = cell.text ? 'view' : 'edit';
  const [status, setStatus] = useState<'edit' | 'view'>(defaultState);
  const [text, setText] = useState(cell.text);
  const [error, setError] = useState<string | null>(null);

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

  function getValidationError(text: string) {
    const tokens = marked.lexer(text);
    const hasH1 = tokens.some((token) => token.type === 'heading' && token.depth === 1);
    const hasH6 = tokens.some((token) => token.type === 'heading' && token.depth === 6);

    if (hasH1 || hasH6) {
      return 'Markdown cells cannot use h1 or h6 headings, these are reserved for srcbook.';
    }

    return null;
  }

  function onSave() {
    const error = getValidationError(text);

    setError(error);

    if (error === null) {
      updateCellOnClient({ ...cell, text });
      updateCellOnServer(cell, { text });
      setStatus('view');
      return true;
    }
  }

  return (
    <div
      className={cn(
        'group/cell relative w-full rounded-md border border-transparent hover:border-border transition-all',
        status === 'edit' && 'ring-1 ring-ring border-ring hover:border-ring',
        error && 'ring-1 ring-sb-red-30 border-sb-red-30 hover:border-sb-red-30',
      )}
      id={`cell-${cell.id}`}
      onDoubleClick={() => { setStatus('edit'); }}
    >
      {status === 'view' ? (
        <div className="flex flex-col">
          <div className="p-1 w-full hidden group-hover/cell:flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <h5 className="pl-2 text-sm font-mono font-bold">Markdown</h5>
              <DeleteCellWithConfirmation onDeleteCell={() => { onDeleteCell(cell); }}>
                <Button className="border-transparent" size="icon" variant="secondary">
                  <Trash2 size={16} />
                </Button>
              </DeleteCellWithConfirmation>
            </div>
            <div className="flex items-center gap-1">
              <Button
                className="border-transparent"
                onClick={() => { setStatus('edit'); }}
                size="icon"
                variant="secondary"
              >
                <Pencil size={16} />
              </Button>
            </div>
          </div>
          <div className="sb-prose px-3 pt-10 group-hover/cell:pt-0">
            <Markdown>{cell.text}</Markdown>
          </div>
        </div>
      ) : (
        <>
          {error ? <div className="flex items-center gap-2 absolute bottom-1 right-1 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
              <CircleAlert size={16} />
              <p className="text-xs">{error}</p>
            </div> : null}
          <div className="flex flex-col">
            <div className="p-1 w-full flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <h5 className="pl-2 text-sm font-mono font-bold">Markdown</h5>
                <DeleteCellWithConfirmation onDeleteCell={() => { onDeleteCell(cell); }}>
                  <Button className="border-transparent" size="icon" variant="secondary">
                    <Trash2 size={16} />
                  </Button>
                </DeleteCellWithConfirmation>
              </div>
              <div className="flex items-center gap-1">
                <Button onClick={() => { setStatus('view'); }} variant="secondary">
                  Cancel
                </Button>

                <Button onClick={onSave}>Save</Button>
              </div>
            </div>

            <div className="px-3">
              <CodeMirror
                basicSetup={{ lineNumbers: false, foldGutter: false }}
                extensions={[markdown(), keyMap, EditorView.lineWrapping]}
                indentWithTab={false}
                onChange={setText}
                theme={codeTheme}
                value={text}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
