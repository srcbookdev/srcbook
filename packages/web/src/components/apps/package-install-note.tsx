import { useEffect, useState } from 'react';
import { CircleAlertIcon, InfoIcon, Loader2Icon, XIcon } from 'lucide-react';

import { usePackageJson } from './use-package-json';
import { useLogs } from './use-logs';
import { Button } from '@srcbook/components/src/components/ui/button';
import { cn } from '@/lib/utils';

const PackageInstallNote: React.FunctionComponent = () => {
  const { togglePane } = useLogs();
  const { status: npmInstallStatus, npmInstall, nodeModulesExists } = usePackageJson();
  const [showPackageInstallNote, setShowPackageInstallNote] = useState(false);

  useEffect(() => {
    if (
      nodeModulesExists === false &&
      (npmInstallStatus === 'idle' || npmInstallStatus === 'complete')
    ) {
      setShowPackageInstallNote(true);
    }
  }, [nodeModulesExists]);

  switch (npmInstallStatus) {
    case 'installing':
      return (
        <div
          className={cn(
            'absolute bottom-4 left-4 z-50 bg-muted border flex items-center gap-4 h-16 px-4',
            'rounded-lg transition-all duration-150 ease-in-out',
            {
              'opacity-0 -bottom-8': !showPackageInstallNote,
            },
          )}
        >
          <Loader2Icon size={18} className="animate-spin" />
          <span className="select-none">Installing Packages...</span>

          <Button
            className="active:translate-y-0"
            onClick={() => {
              alert('todo');
              setShowPackageInstallNote(false);
            }}
          >
            Cancel
          </Button>
        </div>
      );

    case 'failed':
      return (
        <div
          className={cn(
            'absolute bottom-4 left-4 z-50 bg-muted border flex flex-col gap-4 p-4',
            'rounded-lg transition-all duration-150 ease-in-out',
            {
              'opacity-0 -bottom-8': !showPackageInstallNote,
            },
          )}
        >
          <div className="flex items-center gap-4">
            <CircleAlertIcon size={18} />
            <span className="font-medium select-none">Packages failed to install</span>

            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowPackageInstallNote(false)}
              className="active:translate-y-0"
            >
              <XIcon size={18} />
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              className="active:translate-y-0"
              onClick={() => {
                togglePane();
                setShowPackageInstallNote(false);
              }}
            >
              More info
            </Button>
          </div>
        </div>
      );

    case 'idle':
    case 'complete':
      return (
        <div
          className={cn(
            'absolute bottom-4 left-4 z-50 bg-muted border flex items-center gap-4 h-16 px-4',
            'rounded-lg transition-all duration-150 ease-in-out',
            {
              'opacity-0 -bottom-8': !showPackageInstallNote,
            },
          )}
        >
          <InfoIcon size={18} />
          <span className="select-none">Packages need to be installed</span>

          <div className="flex items-center gap-2">
            <Button
              className="active:translate-y-0"
              onClick={() => npmInstall().then(() => setShowPackageInstallNote(false))}
            >
              Install
            </Button>

            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowPackageInstallNote(false)}
              className="active:translate-y-0"
            >
              <XIcon size={18} />
            </Button>
          </div>
        </div>
      );
  }
};

export default PackageInstallNote;
