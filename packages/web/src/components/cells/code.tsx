import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  CellType,
  CodeCellType,
  CodeCellUpdateAttrsType,
  CellErrorPayloadType,
  CellFormattedPayloadType,
  AiGeneratedCellPayloadType,
  TsServerDefinitionLocationResponsePayloadType,
  TsServerDiagnosticType,
} from '@srcbook/shared';
import { useSettings } from '@/components/use-settings';
import CodeCell from '@srcbook/components/src/components/cells/code';
import { SessionType } from '@/types';
import { CellModeType } from '@srcbook/components/src/types';
import { SessionChannel } from '@/clients/websocket';
import { useCells } from '@srcbook/components/src/components/use-cell';
import { mapCMLocationToTsServer, mapTsServerLocationToCM } from './util';
import { toast } from 'sonner';
import { getFileContent, runCodiumAiAutocomplete } from '@/lib/server';
import { tsHover } from '@/components/cells/hover';
import { autocompletion } from '@codemirror/autocomplete';
import { type Diagnostic, linter } from '@codemirror/lint';
import { javascript } from '@codemirror/lang-javascript';
import { getCompletions } from '@/components/cells/get-completions';
import CodeMirror, {
  EditorState,
  EditorView,
  Extension,
  KeyBinding,
  keymap,
  Prec,
} from '@uiw/react-codemirror';
import useTheme from '@srcbook/components/src/components/use-theme';
import { Dialog, DialogContent } from '@srcbook/components/src/components/ui/dialog';
import { inlineCopilot } from "codemirror-copilot";

function tsLinter(
  cell: CodeCellType,
  getTsServerDiagnostics: (id: string) => TsServerDiagnosticType[],
  getTsServerSuggestions: (id: string) => TsServerDiagnosticType[],
) {
  const semanticDiagnostics = getTsServerDiagnostics(cell.id);
  const syntaticDiagnostics = getTsServerSuggestions(cell.id);
  const diagnostics = [...syntaticDiagnostics, ...semanticDiagnostics].filter(
    isDiagnosticWithLocation,
  );

  const cm_diagnostics = diagnostics.map((diagnostic) => {
    return convertTSDiagnosticToCM(diagnostic, cell.source);
  });

  return linter(async (): Promise<readonly Diagnostic[]> => {
    return cm_diagnostics;
  });
}

function tsCategoryToSeverity(
  diagnostic: Pick<TsServerDiagnosticType, 'category' | 'code'>,
): Diagnostic['severity'] {
  if (diagnostic.code === 7027) {
    return 'warning';
  }
  // force resolve types with fallback
  switch (diagnostic.category) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'suggestion':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'info';
  }
}

function isDiagnosticWithLocation(
  diagnostic: TsServerDiagnosticType,
): diagnostic is TsServerDiagnosticType {
  return !!(typeof diagnostic.start.line === 'number' && typeof diagnostic.end.line === 'number');
}

function tsDiagnosticMessage(diagnostic: TsServerDiagnosticType): string {
  if (typeof diagnostic.text === 'string') {
    return diagnostic.text;
  }
  return JSON.stringify(diagnostic); // Fallback
}

function convertTSDiagnosticToCM(diagnostic: TsServerDiagnosticType, code: string): Diagnostic {
  const message = tsDiagnosticMessage(diagnostic);

  return {
    from: mapTsServerLocationToCM(code, diagnostic.start.line, diagnostic.start.offset),
    to: mapTsServerLocationToCM(code, diagnostic.end.line, diagnostic.end.offset),
    message: message,
    severity: tsCategoryToSeverity(diagnostic),
    renderMessage: () => {
      const dom = document.createElement('div');
      dom.className = 'p-2 space-y-3 border-t max-w-lg max-h-64 text-xs relative';
      dom.innerText = message;

      return dom;
    },
  };
}

const DEBOUNCE_DELAY = 500;

type BaseProps = {
  session: SessionType;
  cell: CodeCellType;
};

type RegularProps = BaseProps & {
  readOnly?: false;
  channel: SessionChannel;
  updateCellOnServer: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => void;
  onDeleteCell: (cell: CellType) => void;
};
type ReadOnlyProps = BaseProps & { readOnly: true };
type Props = RegularProps | ReadOnlyProps;

export default function ControlledCodeCell(props: Props) {
  const { readOnly, cell } = props;
  const channel = !readOnly ? props.channel : null;

  const { theme, codeTheme } = useTheme();

  const [filenameError, _setFilenameError] = useState<string | null>(null);
  const [showStdio, setShowStdio] = useState(false);
  const [cellMode, setCellMode] = useState<CellModeType>('off');
  const [generationType, setGenerationType] = useState<'edit' | 'fix'>('edit');
  const [prompt, setPrompt] = useState('');
  const [newSource, setNewSource] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const { aiEnabled } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');

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

  const {
    updateCell: updateCellOnClient,
    clearOutput,
    getTsServerDiagnostics,
    getTsServerSuggestions,
  } = useCells();

  function setFilenameError(error: string | null) {
    _setFilenameError(error);
    setTimeout(() => _setFilenameError(null), 3000);
  }

  useEffect(() => {
    if (!channel) {
      return;
    }

    function callback(payload: CellErrorPayloadType) {
      if (payload.cellId !== cell.id) {
        return;
      }

      const filenameError = payload.errors.find((e) => e.attribute === 'filename');

      if (filenameError) {
        setFilenameError(filenameError.message);
      }

      const formattingError = payload.errors.find((e) => e.attribute === 'formatting');
      if (formattingError) {
        toast.error(formattingError.message);
        setCellMode('off');
      }
    }

    channel.on('cell:error', callback);

    return () => channel.off('cell:error', callback);
  }, [cell.id, channel]);

  useEffect(() => {
    if (!channel) {
      return;
    }

    function callback(payload: CellFormattedPayloadType) {
      if (payload.cellId === cell.id) {
        updateCellOnClient({ ...payload.cell });
        setCellMode('off');
      }
    }

    channel.on('cell:formatted', callback);
    return () => channel.off('cell:formatted', callback);
  }, [cell.id, channel, updateCellOnClient]);

  function onUpdateFileName(filename: string) {
    if (!channel) {
      return;
    }

    updateCellOnClient({ ...cell, filename });
    channel.push('cell:rename', {
      cellId: cell.id,
      filename,
    });
  }

  useEffect(() => {
    if (!channel) {
      return;
    }

    function callback(payload: AiGeneratedCellPayloadType) {
      if (payload.cellId !== cell.id) return;
      // We move to the "review" stage of the generation process:
      setNewSource(payload.output);
      setCellMode('reviewing');
    }
    channel.on('ai:generated', callback);
    return () => channel.off('ai:generated', callback);
  }, [cell.id, channel]);

  const generate = () => {
    if (!channel) {
      return;
    }

    setGenerationType('edit');
    channel.push('ai:generate', {
      cellId: cell.id,
      prompt,
    });
    setCellMode('generating');
  };

  const aiFixDiagnostics = (diagnostics: string) => {
    if (!channel) {
      return;
    }
    setCellMode('fixing');
    setGenerationType('fix');
    channel.push('ai:fix_diagnostics', {
      cellId: cell.id,
      diagnostics,
    });
  };

  function runCell() {
    if (!channel) {
      return false;
    }
    if (cell.status === 'running') {
      return false;
    }

    setShowStdio(true);

    // Update client side only. The server will know it's running from the 'cell:exec' event.
    updateCellOnClient({ ...cell, status: 'running' });
    clearOutput(cell.id);

    // Add artificial delay to allow debounced updates to propagate
    // TODO: Handle this in a more robust way
    setTimeout(() => {
      channel.push('cell:exec', {
        cellId: cell.id,
      });
    }, DEBOUNCE_DELAY + 10);
  }

  function stopCell() {
    if (!channel) {
      return;
    }
    channel.push('cell:stop', { cellId: cell.id });
  }

  function onRevertDiff() {
    setCellMode(generationType === 'edit' ? 'prompting' : 'off');
    setNewSource('');
  }

  function onAcceptDiff() {
    if (readOnly) {
      return;
    }
    updateCellOnClient({ ...cell, source: newSource });
    props.updateCellOnServer(cell, { source: newSource });
    setPrompt('');
    setCellMode('off');
  }

  function formatCell() {
    if (!channel) {
      return;
    }
    setCellMode('formatting');
    channel.push('cell:format', {
      cellId: cell.id,
    });
  }

  async function onGetDefinitionContents(pos: number, cell: CodeCellType): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!channel) {
        return;
      }

      async function gotoDefCallback({ response }: TsServerDefinitionLocationResponsePayloadType) {
        if (!channel) {
          return;
        }

        channel.off('tsserver:cell:definition_location:response', gotoDefCallback);
        if (response === null) {
          reject(new Error(`Error fetching file content: no response!`));
          return;
        }
        const file_response = await getFileContent(response.file);
        if (file_response.result.type === 'cell') {
          document
            .getElementById(file_response.result.filename)
            ?.scrollIntoView({ behavior: 'smooth' });
        } else {
          if (file_response.error) {
            reject(new Error(`Error fetching file content: ${file_response.result}`));
          } else {
            resolve(file_response.result.content);
          }
        }
      }

      channel.on('tsserver:cell:definition_location:response', gotoDefCallback);
      channel.push('tsserver:cell:definition_location:request', {
        cellId: cell.id,
        request: { location: mapCMLocationToTsServer(cell.source, pos) },
      });
    });
  }

  // The order of these extensions is important.
  // We want the errors to be first, so we call tsLinter before tsHover.
  const extensions: Array<Extension> = [javascript({ typescript: true })];
  if (channel) {
    extensions.push(tsHover(cell, channel, theme));
  }
  extensions.push(tsLinter(cell, getTsServerDiagnostics, getTsServerSuggestions));
  if (channel) {
    extensions.push(
      autocompletion({
        override: [(context) => getCompletions(context, cell, channel)],
      }),
    );
  }
  extensions.push(
    inlineCopilot(async (prefix, suffix) => {
      let response;
      try {
        response = await runCodiumAiAutocomplete(prefix+suffix, prefix.length);
      } catch (err) {
        console.error('Error fetching ai autocomplete suggestion:', err);
        return "";
      }

      if (response.error) {
        return "";
      }

      const completionItems = response.result.completionItems ?? [];
      const mostLikelyCompletionScore = Math.min(...completionItems.map(item => item.completion.score));
      const mostLikelyCompletion = completionItems.find(item => item.completion.score === mostLikelyCompletionScore);

      return mostLikelyCompletion?.completionParts[0]?.text ?? "";
    }, DEBOUNCE_DELAY),
  );
  extensions.push(
    Prec.highest(
      EditorView.domEventHandlers({
        click: (e, view) => {
          if (!onGetDefinitionContents) {
            return;
          }
          const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
          if (pos && e.altKey) {
            onGetDefinitionContents(pos, cell)
              .then((result) => {
                setModalContent(result);
                setIsModalOpen(true);
              })
              .catch((error) => {
                console.error('Error calling onGetDefinitionContents:', error);
                toast.error('Error calling goto definition!');
              });
          }
        },
      }),
    ),
  );

  const keys: Array<KeyBinding> = [];
  if (runCell) {
    keys.push({
      key: 'Mod-Enter',
      run: () => {
        runCell();
        return true;
      },
    });
  }
  if (formatCell) {
    keys.push({
      key: 'Shift-Alt-f',
      run: () => {
        formatCell();
        return true;
      },
    });
  }
  extensions.push(Prec.highest(keymap.of(keys)));

  if (['generating', 'prompting', 'formatting'].includes(cellMode)) {
    extensions.push(EditorView.editable.of(false));
    extensions.push(EditorState.readOnly.of(true));
  }

  if (props.readOnly) {
    return <CodeCell readOnly cell={props.cell} session={props.session} codeTheme={codeTheme} />;
  } else {
    return (
      <>
        <CodeCell
          aiEnabled={aiEnabled}
          aiFixDiagnostics={aiFixDiagnostics}
          cell={props.cell}
          cellMode={cellMode}
          filenameError={filenameError}
          fullscreen={fullscreen}
          generationType={generationType}
          newSource={newSource}
          onAccept={onAcceptDiff}
          onChangeCellModeType={setCellMode}
          onChangeFilenameError={setFilenameError}
          onChangeFullscreen={setFullscreen}
          onChangeGenerationType={setGenerationType}
          onChangeNewSource={setNewSource}
          onChangePrompt={setPrompt}
          onChangeShowStdio={setShowStdio}
          onDeleteCell={props.onDeleteCell}
          onFormatCell={formatCell}
          onGenerate={generate}
          onGetDefinitionContents={onGetDefinitionContents}
          onRevert={onRevertDiff}
          onRunCell={runCell}
          onStopCell={stopCell}
          onUpdateFileName={onUpdateFileName}
          prompt={prompt}
          session={props.session}
          showStdio={showStdio}
          updateCellOnServer={props.updateCellOnServer}
          fixDiagnostics={aiFixDiagnostics}
          editorExtensions={extensions}
          codeTheme={codeTheme}
        />
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-[80vw] h-[80vh] max-w-none p-0 overflow-scroll">
            <CodeMirror
              className="overflow-scroll focus-visible:outline-none"
              value={modalContent}
              theme={codeTheme}
              extensions={[
                javascript({ typescript: true }),
                EditorView.editable.of(false),
                EditorState.readOnly.of(true),
              ]}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
