import { useFiles } from '@/components/apps/use-files';
import { CodeEditor } from '@/components/apps/editor';
import AppLayout from './layout';

export default function AppFilesShow() {
  const { openedFile, updateFile } = useFiles();

  return (
    <AppLayout activeTab="code" activePanel="explorer">
      {openedFile ? (
        <CodeEditor
          path={openedFile.path}
          source={openedFile.source}
          onChange={(source) => updateFile(openedFile, { source })}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-tertiary-foreground">
          Use the file explorer to open a file for editing
        </div>
      )}
    </AppLayout>
  );
}
