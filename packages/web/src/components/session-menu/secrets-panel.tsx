// import { SessionMenuPanelContentsProps } from '.';

import { useEffect, useState } from "react";
import { getSecrets } from "@/lib/server";

type PropsType = Record<string, never>; // Pick<SessionMenuPanelContentsProps, 'session' | 'openDepsInstallModal'>;

type SecretsList = Record<string, string>;

export default function SessionMenuPanelSecrets(_props: PropsType) {
  const [secretsList, setSecretsList] = useState<
    | { status: 'idle' } 
    | { status: 'loading' }
    | { status: 'complete', data: SecretsList }
    | { status: 'error' }
  >({ status: 'idle' });
  useEffect(() => {
    const run = async () => {
      setSecretsList({ status: 'loading' });
      let result: SecretsList;
      try {
        result = (await getSecrets()).result;
      } catch (err) {
        console.error('Error loading secrets!', err);
        setSecretsList({ status: 'error' });
        return;
      }

      setSecretsList({ status: 'complete', data: result });
    };

    // FIXME: it is possible for this to run twice in parallel?
    run();
  }, []);

  return (
    <>
      <div>Secrets</div>
      TODO

      {secretsList.status === "idle" || secretsList.status === "loading" ? (
        <span>Loading</span>
      ) : null}
      {secretsList.status === "error" ? (
        <span>Error loading secrets!</span>
      ) : null}
      {secretsList.status === "complete" ? (
        <div>
          {Object.entries(secretsList.data).map(([secretKey, secretValue]) => (
            <div key={secretKey}>{secretKey}: {secretValue}</div>
          ))}
        </div>
      ) : null}
    </>
  );
}
