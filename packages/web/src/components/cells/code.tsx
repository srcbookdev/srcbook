/* eslint-disable jsx-a11y/tabindex-no-positive -- this should be fixed and reworked or minimize excessive positibe tabindex */

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
} from '@srcbook/shared';
import { useSettings } from '@/components/use-settings';
import CodeCell from '@srcbook/components/src/components/cells/code';
import { CellModeType, SessionType } from '@/types';
import { SessionChannel } from '@/clients/websocket';
import { useCells } from '../use-cell';
import { mapCMLocationToTsServer } from './util';
import { toast } from 'sonner';
import { getFileContent } from '@/lib/server';

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
  const { readOnly, session, cell } = props;
  const channel = !readOnly ? props.channel : null;

  const [filenameError, _setFilenameError] = useState<string | null>(null);
  const [showStdio, setShowStdio] = useState(false);
  const [cellMode, setCellMode] = useState<CellModeType>('off');
  const [generationType, setGenerationType] = useState<'edit' | 'fix'>('edit');
  const [prompt, setPrompt] = useState('');
  const [newSource, setNewSource] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
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

  const { updateCell: updateCellOnClient, clearOutput } = useCells();

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
      sessionId: session.id,
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
      sessionId: session.id,
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
      sessionId: session.id,
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
        sessionId: session.id,
        cellId: cell.id,
      });
    }, DEBOUNCE_DELAY + 10);
  }

  function stopCell() {
    if (!channel) {
      return;
    }
    channel.push('cell:stop', { sessionId: session.id, cellId: cell.id });
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
      sessionId: session.id,
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
        sessionId: session.id,
        cellId: cell.id,
        request: { location: mapCMLocationToTsServer(cell.source, pos) },
      });
    });
  }

  if (props.readOnly) {
    return (
      <CodeCell
        readOnly
        cell={props.cell}
        session={props.session}
      />
    );
  } else {
    return (
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
        updateCellOnClient={updateCellOnClient}
      />
    );
  }
}
