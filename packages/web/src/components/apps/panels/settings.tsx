import { Button } from '@srcbook/components/src/components/ui/button';
import { usePackageJson } from '../use-package-json';

export default function PackagesPanel() {
  const { status, npmInstall, clearNodeModules, nodeModulesExists } = usePackageJson();

  return (
    <div className="flex flex-col gap-6 px-5 w-[360px]">
      <p className="text-sm text-tertiary-foreground">
        Clean and manage your packages. To add packages, use the button below or ask the AI in chat.
      </p>

      <div className="flex flex-col gap-2">
        <p className="font-medium">Clean</p>
        <p className="text-sm text-tertiary-foreground">
          If you suspect your node_modules are corrupted, you can clear them and reinstall all
          packages.
        </p>
        <div>
          <Button onClick={() => clearNodeModules()} disabled={nodeModulesExists !== true}>
            Clear node_modules/
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-medium">Reinstall</p>
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
