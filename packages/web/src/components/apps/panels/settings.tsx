import { Button } from '@srcbook/components/src/components/ui/button';
import { usePackageJson } from '../use-package-json';

export default function SettingsPanel() {
  const { status, output, npmInstall, clearNodeModules, nodeModulesExists } = usePackageJson();

  return (
    <div className="flex flex-col gap-4 px-5 w-[360px]">
      <div>
        <Button onClick={() => npmInstall()} disabled={status === 'installing'}>
          Run npm install
        </Button>
      </div>
      <div>
        <Button
          onClick={() => npmInstall(['uuid'])}
          variant="secondary"
          disabled={status === 'installing'}
        >
          Run npm install uuid
        </Button>
      </div>
      <div>
        exists={JSON.stringify(nodeModulesExists)}
        <Button
          onClick={() => clearNodeModules()}
          variant="secondary"
          disabled={nodeModulesExists !== true}
        >
          Clear node_modules
        </Button>
      </div>

      {status !== 'idle' ? (
        <>
          <span>
            Status: <code>{status}</code>
          </span>
          <pre className="font-mono text-sm bg-tertiary p-2 overflow-auto rounded-md border">
            {/* FIXME: disambiguate between stdout and stderr in here using n.type! */}
            {output.map((n) => n.data).join('\n')}
          </pre>
        </>
      ) : null}
    </div>
  );
}
