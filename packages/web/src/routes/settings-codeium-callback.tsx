import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useEffectOnce from '@/components/use-effect-once';
import { useSettings } from '@/components/use-settings';

export async function exchangeCodeiumAccessTokenForApiKey(accessToken: string): Promise<{
  api_key: string;
  name: string;
}> {
  // from: https://github.com/Exafunction/codeium.vim/blob/d85a85ca7e12967db22b00fd5e9f1a095bb47c96/autoload/codeium/command.vim#L90
  const response = await fetch('https://api.codeium.com/register_user/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firebase_id_token: accessToken }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error(`Error exchanging codeium access token for api key: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function SettingsCodeiumCallback() {
  const [status, setStatus] = useState<
    'loading' | 'already_set' | 'no_access_token' | 'token_exchange_error'
  >('loading');
  const { codeiumApiKey, updateConfig } = useSettings();

  const navigate = useNavigate();
  const [queryParams] = useSearchParams();

  useEffectOnce(() => {
    if (codeiumApiKey) {
      setStatus("already_set");
      return;
    }
    const accessToken = queryParams.get('access_token');
    if (!accessToken) {
      setStatus("no_access_token");
      return;
    }

    exchangeCodeiumAccessTokenForApiKey(accessToken).then(async response => {
      const apiKey = response.api_key;
      await updateConfig({ codeiumApiKey: apiKey });

      navigate('/settings');
    }).catch(err => {
      console.error(err);
      setStatus("token_exchange_error");
    });
  });

  switch (status) {
    case "loading":
      return (
        <div>Loading...</div>
      );
    case "already_set":
      return (
        <div>Codeium credentials already set!</div>
      );
    case "no_access_token":
      return (
        <div>No <code>access_token</code> query parameter found!</div>
      );
    case "token_exchange_error":
      return (
        <div>Error exchanging codeium access token for api key!</div>
      );
  }
};

export default SettingsCodeiumCallback;
