// import { SessionMenuPanelContentsProps } from '.';

import { useCallback, useEffect, useState } from "react";
import { toast } from 'sonner';
import { type SecretWithAssociatedSessions } from '@srcbook/shared';

import { getSecrets, associateSecretWithSession, disassociateSecretWithSession } from "@/lib/server";
import { Switch } from "@/components/ui/switch";
import { SessionMenuPanelContentsProps } from ".";

type PropsType = Pick<SessionMenuPanelContentsProps, 'session'>;

export default function SessionMenuPanelSecrets(props: PropsType) {
  const [secretsList, setSecretsList] = useState<
    | { status: 'idle' } 
    | { status: 'loading' }
    | { status: 'complete', data: Array<SecretWithAssociatedSessions> }
    | { status: 'error' }
  >({ status: 'idle' });
  useEffect(() => {
    const run = async () => {
      setSecretsList({ status: 'loading' });
      let result: Array<SecretWithAssociatedSessions>;
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
