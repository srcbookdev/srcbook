// ref: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
type ShowSaveFilePicker = (options?: {
  excludeAcceptAllOption?: boolean;
  id?: string;
  startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: { [mimetype: string]: Array<string> };
  }>;
}) => Promise<FileSystemFileHandle>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const showSaveFilePicker: ShowSaveFilePicker | undefined = (window as any)
  .showSaveFilePicker;
