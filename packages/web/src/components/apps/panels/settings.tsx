import { Button } from '@srcbook/components/src/components/ui/button';
import { usePackageJson } from '../use-package-json';

export default function PackagesPanel() {
  const { status, output, npmInstall, clearNodeModules, nodeModulesExists } = usePackageJson();

  return (
    <div className="flex flex-col gap-4 px-5 w-[360px]">
      <p className="text-sm text-tertiary-foreground">
        Clear your node_modules, re-install packages and inspect the output logs from{' '}
        <pre>npm install</pre>
      </p>
      <div>
        <Button onClick={() => npmInstall()} disabled={status === 'installing'}>
          Run npm install
        </Button>
      </div>

      {status !== 'idle' ? (
        <>
          <h3 className="text-sm font-medium">Logs</h3>
          <pre className="font-mono text-xs bg-tertiary p-2 overflow-auto rounded-md border">
            {/* FIXME: disambiguate between stdout and stderr in here using n.type! */}
            {output.map((n) => n.data).join('\n')}
          </pre>
        </>
      ) : null}

      {process.env.NODE_ENV !== 'production' && (
        <>
          <span>
            Status: <code>{status}</code>
          </span>
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
        </>
      )}
    </div>
  );
}
