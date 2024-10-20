import { useEffect, useState } from 'react';
import { CircleAlertIcon, InfoIcon, Loader2Icon, XIcon } from 'lucide-react';

import { usePackageJson } from './use-package-json';
import { useLogs } from './use-logs';
import { Button } from '@srcbook/components/src/components/ui/button';
import { cn } from '@/lib/utils';

const ToastWrapper: React.FC<{ showToast: boolean; children: React.ReactNode }> = ({
  showToast,
  children,
}) => (
  <div
    className={cn(
      'absolute bottom-4 left-4 z-20 bg-muted border flex items-center gap-4 p-4',
      'rounded-lg transition-all duration-150 ease-in-out',
      {
        'opacity-0 -bottom-8': !showToast,
      },
    )}
  >
    {children}
  </div>
);

const PackageInstallToast: React.FunctionComponent = () => {
  const { togglePane } = useLogs();
  const { status, npmInstall, nodeModulesExists } = usePackageJson();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (nodeModulesExists === false && (status === 'idle' || status === 'complete')) {
      setShowToast(true);
    }
  }, [nodeModulesExists, status]);

  switch (status) {
    case 'installing':
      return (
        <ToastWrapper showToast={showToast}>
          <Loader2Icon size={18} className="animate-spin" />
          <span className="select-none">Installing Packages...</span>

          <Button
            className="active:translate-y-0"
            onClick={() => {
              alert('todo');
              setShowToast(false);
            }}
          >
            Cancel
          </Button>
        </ToastWrapper>
      );

    case 'failed':
      return (
        <ToastWrapper showToast={showToast}>
          <CircleAlertIcon size={18} />
          <span className="font-medium select-none">Packages failed to install</span>

          <Button
            className="active:translate-y-0"
            onClick={() => {
              togglePane();
              setShowToast(false);
            }}
          >
            More info
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowToast(false)}
            className="active:translate-y-0"
          >
            <XIcon size={18} />
          </Button>
        </ToastWrapper>
      );

    case 'idle':
    case 'complete':
      return (
        <ToastWrapper showToast={showToast}>
          <InfoIcon size={18} />
          <span className="select-none">Packages need to be installed</span>

          <div className="flex items-center gap-2">
            <Button
              className="active:translate-y-0"
              onClick={() => npmInstall().then(() => setShowToast(false))}
            >
              Install
            </Button>

            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowToast(false)}
              className="active:translate-y-0"
            >
              <XIcon size={18} />
            </Button>
          </div>
        </ToastWrapper>
      );
  }
};

export default PackageInstallToast;
