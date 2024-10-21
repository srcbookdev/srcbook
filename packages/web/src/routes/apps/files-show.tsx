import { useFiles } from '@/components/apps/use-files';
import { CodeEditor } from '@/components/apps/editor';
import AppLayout from './layout';

export default function AppFilesShow() {
  const { openedFile: _openedFile, updateFile } = useFiles();

  // TODO: Handle 404s from server.
  const openedFile = _openedFile!;

  return (
    <AppLayout activeTab="code" activePanel="explorer">
      <CodeEditor
        path={openedFile.path}
        source={openedFile.source}
        onChange={(source) => updateFile(openedFile, { source })}
      />
    </AppLayout>
  );
}
