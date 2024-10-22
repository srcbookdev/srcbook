import { useEffect, useState } from 'react';
import { usePreview } from '@/components/apps/use-preview';
import { usePackageJson } from '@/components/apps/use-package-json';
import { useLogs } from '@/components/apps/use-logs';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@srcbook/components';
import AppLayout from './layout';

export default function AppPreview() {
  return (
    <AppLayout activeTab="preview" activePanel={null}>
      <Preview />
    </AppLayout>
  );
}

function Preview() {
  const { url, status, start, exitCode } = usePreview();
  const { nodeModulesExists } = usePackageJson();
  const { togglePane } = useLogs();

  const [startAttempted, setStartAttempted] = useState(false);
  useEffect(() => {
    if (nodeModulesExists && status === 'stopped' && !startAttempted) {
      setStartAttempted(true);
      start();
    }
  }, [nodeModulesExists, status, start, startAttempted]);

  if (nodeModulesExists === false) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <span className="text-tertiary-foreground">Dependencies not installed</span>
      </div>
    );
  }

  switch (status) {
    case 'connecting':
    case 'booting':
      return (
        <div className="flex justify-center items-center w-full h-full">
          <Loader2Icon size={18} className="animate-spin" />
        </div>
      );
    case 'running':
      if (url === null) {
        return;
      }

      return (
        <div className="w-full h-full">
          <iframe className="w-full h-full" src={url} title="App preview" />
        </div>
      );
    case 'stopped':
      return (
        <div className="flex justify-center items-center w-full h-full">
          {exitCode === null || exitCode === 0 ? (
            <span className="text-tertiary-foreground">Dev server is stopped.</span>
          ) : (
            <div className="flex flex-col gap-6 items-center border border-border p-8 border-dashed rounded-md">
              <span className="text-red-400">Dev server exited with an error.</span>
              <Button variant="secondary" onClick={togglePane}>
                Open errors pane
              </Button>
            </div>
          )}
        </div>
      );
  }
}
