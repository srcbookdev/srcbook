import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { CardContainer } from './srcbook-cards';
import { createSession, importSrcbook } from '@/lib/server';

function Modal(props: { open: boolean }) {
  if (!props.open) {
    return null;
  }

  const state = props.open ? 'open' : 'closed';

  return (
    <>
      <div
        aria-hidden="true"
        data-state={state}
        className="fixed inset-0 z-50 bg-sb-core-130/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      ></div>
      <CardContainer
        role="dialog"
        data-state={state}
        className="focus-within:outline-none fixed w-full max-w-sm h-48 p-6 left-[50%] top-[50%] z-50 grid gap-4 bg-background border rounded-md shadow-xl translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
      >
        <div className="flex flex-col h-full gap-3">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-14 h-14 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
              <Upload size={18} />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <strong className="text-lg font-semibold leading-tight">Open Srcbook</strong>
            <p className="text-tertiary-foreground">
              Drop <code className="code">.srcmd</code> file to open
            </p>
          </div>
        </div>
      </CardContainer>
    </>
  );
}

export function DragAndDropSrcmdModal(props: { children: React.ReactNode }) {
  const [showDndModal, setShowDndModal] = useState(false);

  const navigate = useNavigate();

  const onDrop = useCallback(
    async (files: File[]) => {
      // TODO: Error handling
      if (files.length !== 1) {
        return;
      }

      const file = files[0];

      // TODO: Error handling
      if (!file.name.endsWith('.srcmd')) {
        return;
      }

      const text = await file.text();

      // TODO: Error handling
      const { result } = await importSrcbook({ text });
      const { result: session } = await createSession({ path: result.dir });

      setShowDndModal(false);

      return navigate(`/srcbooks/${session.id}`);
    },
    [navigate],
  );

  const { getRootProps } = useDropzone({
    onDrop,
    noClick: true,
    multiple: false,
    maxFiles: 1,
    onDragEnter: () => setShowDndModal(true),
    onDragLeave: () => setShowDndModal(false),
  });

  return (
    <div {...getRootProps()}>
      {props.children}
      <Modal open={showDndModal} />
    </div>
  );
}
