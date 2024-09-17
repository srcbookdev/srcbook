import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { UploadIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type FileUploadDropZoneProps = {
  onDrop: (uploadedFile: File) => void;
};

export default function FileUploadDropZone({ onDrop }: FileUploadDropZoneProps) {
  const onDropInternal = useCallback(
    (acceptedFiles: Array<File>) => {
      if (acceptedFiles.length > 1) {
        toast.error('Please drop only a single .src.md file!');
        return;
      }
      const file = acceptedFiles[0]!;

      if (!file.name.endsWith('.src.md')) {
        toast.error('Please drop only a single .src.md file!');
        return;
      }

      onDrop(file);
    },
    [onDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropInternal });

  const rootProps = getRootProps();
  return (
    <button
      {...rootProps}
      className={cn(
        'flex flex-col gap-4 w-full items-center justify-center h-[160px] border border-dashed rounded-md',
        'hover:bg-muted cursor-pointer',
        {
          'bg-muted': isDragActive,
        },
        rootProps.className,
      )}
    >
      <input {...getInputProps()} />

      {isDragActive ? (
        <span>Drop file here</span>
      ) : (
        <>
          <div className="w-14 h-14 flex items-center justify-center rounded-full border">
            <UploadIcon size={24} />
          </div>
          <span>
            Click to browse or drag and drop a <code>.src.md</code> file here
          </span>
        </>
      )}
    </button>
  );
}
