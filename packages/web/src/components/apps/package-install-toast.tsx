import { useEffect, useState } from 'react';
import { CircleAlertIcon, InfoIcon, Loader2Icon } from 'lucide-react';

import { usePackageJson } from './use-package-json';
import { useLogs } from './use-logs';
import { Button } from '@srcbook/components/src/components/ui/button';
import { cn } from '@/lib/utils';

const ToastWrapper: React.FC<{
  showToast: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ className, showToast, children }) => (
  <div
    className={cn(
      'absolute bottom-4 left-4 z-20 p-3 bg-muted border',
      'rounded-md transition-all duration-150 ease-in-out text-sm',
      {
        'opacity-0 -bottom-8': !showToast,
      },
      className,
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
    } else if (nodeModulesExists === true) {
      setShowToast(false);
    }
  }, [nodeModulesExists, status]);

  switch (status) {
    case 'installing':
      return (
        <ToastWrapper showToast={showToast} className="flex items-center gap-9">
          <div className="flex items-center gap-3">
            <Loader2Icon size={18} className="animate-spin" />
            <span className="select-none">Installing Packages...</span>
          </div>

          <Button
            variant="ghost"
            className="active:translate-y-0"
            onClick={() => setShowToast(false)}
          >
            Close
          </Button>
        </ToastWrapper>
      );

    case 'failed':
      return (
        <ToastWrapper showToast={showToast} className="flex items-center gap-9">
          <div className="flex items-center gap-3">
            <CircleAlertIcon size={18} />
            <span className="font-medium select-none">Packages failed to install</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="active:translate-y-0"
              onClick={() => setShowToast(false)}
            >
              Close
            </Button>
            <Button
              className="active:translate-y-0"
              onClick={() => {
                togglePane();
                setShowToast(false);
              }}
            >
              More info
            </Button>
          </div>
        </ToastWrapper>
      );

    case 'idle':
    case 'complete':
      return (
        <ToastWrapper showToast={showToast} className="flex items-center gap-9">
          <div className="flex items-center gap-3">
            <InfoIcon size={18} />
            <span className="select-none">Packages need to be installed</span>
          </div>

          <Button
            className="active:translate-y-0"
            onClick={() => npmInstall().then(() => setShowToast(false))}
          >
            Install
          </Button>
        </ToastWrapper>
      );
  }
};

export default PackageInstallToast;
