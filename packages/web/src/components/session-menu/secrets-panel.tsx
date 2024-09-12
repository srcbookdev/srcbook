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

  // Store a list of all secret name association changes that are in progress so that a user cannot
  // change an already in flight association
  const [loadingSecretNames, setLoadingSecretName] = useState<Set<string>>(new Set());
  const onRegisterLoadingSecretName = useCallback((secretName: string) => {
    setLoadingSecretName(old => {
      const newSet = new Set(old)
      newSet.add(secretName);
      return newSet;
    });
  }, [setLoadingSecretName]);
  const onDeregisterLoadingSecretName = useCallback((secretName: string) => {
    setLoadingSecretName(old => {
      const newSet = new Set(old)
      newSet.delete(secretName);
      return newSet;
    });
  }, [setLoadingSecretName]);

  const onChangeSecretEnabled = useCallback(async (secretName: string, enabled: boolean) => {
    onRegisterLoadingSecretName(secretName);

    try {
      if (enabled) {
        await associateSecretWithSession(props.session.id, secretName);
      } else {
        await disassociateSecretWithSession(props.session.id, secretName);
      }
    } catch (err) {
      onDeregisterLoadingSecretName(secretName);
      console.error(`Error changing secret ${secretName} enabled:`, err);
      toast.error("Error enabling/disabling secret!");
      return;
    }

    // After changing the secret value, optimisitcally update the secrets list
    // FIXME: maybe it would be better to just refetch?
    setSecretsList(old => {
      if (old.status !== 'complete') {
        return old;
      }

      return {
        ...old,
        data: old.data.map(item => {
          if (item.name === secretName) {
            return {
              ...item,
              associatedWithSessionIds: enabled ? (
                [...item.associatedWithSessionIds, props.session.id ]
              ) : item.associatedWithSessionIds.filter(id => id !== props.session.id),
            };
          } else {
            return item;
          }
        }),
      };
    });

    // NOTE: add a slight delay before removing the loading state to minimize ui flicker
    setTimeout(() => {
      onDeregisterLoadingSecretName(secretName);
    }, 50);
  }, [props.session.id]);

  return (
    <>
      <h4 className="text-lg font-semibold leading-tight mb-2">Secrets</h4>
      <h6 className="mb-4 text-tertiary-foreground">Available in this srcbook</h6>

      {secretsList.status === "idle" || secretsList.status === "loading" ? (
        <span>Loading</span>
      ) : null}
      {secretsList.status === "error" ? (
        <span>Error loading secrets!</span>
      ) : null}
      {secretsList.status === "complete" ? (
        <div>
          {secretsList.data.map(secret => {
            const checked = secret.associatedWithSessionIds.includes(props.session.id);
            return (
              <div
                className="flex items-center justify-between h-8 cursor-pointer"
                key={secret.name}
                onClick={() => onChangeSecretEnabled(secret.name, !checked)}
              >
                <span className="font-mono">{secret.name}</span>
                <div onClick={e => e.stopPropagation()}>
                  <Switch
                    disabled={loadingSecretNames.has(secret.name)}
                    checked={checked}
                    onCheckedChange={checked => onChangeSecretEnabled(secret.name, checked)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
