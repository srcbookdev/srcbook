import { Button } from '@srcbook/components/src/components/ui/button';
import { usePackageJson } from '../use-package-json';
import { PackagePlus } from 'lucide-react';
import Shortcut from '@srcbook/components/src/components/keyboard-shortcut';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@srcbook/components/src/components/ui/tooltip';

export default function PackagesPanel() {
  const { setShowInstallModal, npmInstall, clearNodeModules, nodeModulesExists, status } =
    usePackageJson();

  return (
    <div className="flex flex-col gap-6 px-5 w-[360px]">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-tertiary-foreground">
          To add packages, you can simply ask the AI in chat, or use the button below.
        </p>

        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowInstallModal(true)} className="gap-1">
                  <PackagePlus size={16} />
                  Install packages
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Install packages <Shortcut keys={['mod', 'i']} />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-tertiary-foreground">
          If you suspect your node_modules are corrupted, you can clear them and reinstall all
          packages.
        </p>
        <div>
          <Button onClick={() => clearNodeModules()} disabled={nodeModulesExists !== true}>
            Clear node_modules
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-tertiary-foreground">
          Re-run <code className="code">npm install</code>. This will run against the package.json
          from the project root.
        </p>
        <div>
          <Button onClick={() => npmInstall()} disabled={status === 'installing'}>
            Run npm install
          </Button>
        </div>
      </div>
    </div>
  );
}
