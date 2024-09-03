import { useEffect, useState } from 'react';
import { CircleCheck, Loader2, CircleX } from 'lucide-react';
import { getDefaultModel } from '@srcbook/shared';
import type { AiProviderType, CodeLanguageType } from '@srcbook/shared';
import { useLoaderData } from 'react-router-dom';
import { disk, updateConfig, aiHealthcheck } from '@/lib/server';
import { useSettings } from '@/components/use-settings';
import type { SettingsType, FsObjectResultType, FsObjectType } from '@/types';
import { DirPicker } from '@/components/file-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import useTheme from '@/components/use-theme';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

async function loader(): Promise<{ dirname: string; entries: FsObjectType[] }> {
  const { result: diskResult } = await disk({});

  return {
    ...diskResult,
  };
}

async function action({ request }: { request: Request }): Promise<void> {
  const formData = await request.formData();
  const baseDir = formData.get('path') as string | undefined;
  await updateConfig({ baseDir });
}

function Settings(): JSX.Element {
  const { entries, baseDir } = useLoaderData() as SettingsType & FsObjectResultType;
  const {
    aiProvider,
    aiModel,
    aiBaseUrl,
    openaiKey: configOpenaiKey,
    anthropicKey: configAnthropicKey,
    updateConfig: updateConfigContext,
    defaultLanguage,
  } = useSettings();

  const [openaiKey, setOpenaiKey] = useState<string>(configOpenaiKey ?? '');
  const [anthropicKey, setAnthropicKey] = useState<string>(configAnthropicKey ?? '');
  const [model, setModel] = useState<string>(aiModel);
  const [baseUrl, setBaseUrl] = useState<string>(aiBaseUrl || '');

  const updateDefaultLanguage = (value: CodeLanguageType): void => {
    void (async () => {
      await updateConfigContext({ defaultLanguage: value });
    })();
  };

  const setAiProvider = (provider: AiProviderType): void => {
    const defaultModel = getDefaultModel(provider);
    setModel(defaultModel);
    void (async () => {
      await updateConfigContext({ aiProvider: provider, aiModel: defaultModel });
    })();
  };

  const { theme, toggleTheme } = useTheme();

  // Either the key from the server is null/undefined and the user entered input
  // or the key from the server is a string and the user entered input is different.
  const openaiKeySaveEnabled =
    (typeof configOpenaiKey === 'string' && openaiKey !== configOpenaiKey) ||
    ((configOpenaiKey === null || configOpenaiKey === undefined) && openaiKey.length > 0) ||
    model !== aiModel;

  const anthropicKeySaveEnabled =
    (typeof configAnthropicKey === 'string' && anthropicKey !== configAnthropicKey) ||
    ((configAnthropicKey === null || configAnthropicKey === undefined) &&
      anthropicKey.length > 0) ||
    model !== aiModel;

  const customModelSaveEnabled =
    (typeof aiBaseUrl === 'string' && baseUrl !== aiBaseUrl) ||
    ((aiBaseUrl === null || aiBaseUrl === undefined) && baseUrl.length > 0) ||
    model !== aiModel;

  return (
    <div>
      <h4 className="h4 mx-auto mb-6">Settings</h4>
      <div className="space-y-10">
        <div>
          <h2 className="text-xl pb-2">Theme</h2>
          <label className="opacity-70 text-sm" htmlFor="theme-switch">
            Select light or dark mode for the Srcbook app.
          </label>
          <div className="flex items-center gap-2 mt-4">
            <Switch checked={theme === 'dark'} id="theme-switch" onCheckedChange={toggleTheme} />
            <label htmlFor="theme-switch">Dark mode</label>
          </div>
        </div>

        <div>
          <h2 className="text-xl pb-2">Default Language</h2>
          <label className="opacity-70 block pb-4 text-sm" htmlFor="language-selector">
            The default language to use when creating new Srcbooks.
          </label>
          <Select onValueChange={updateDefaultLanguage}>
            <SelectTrigger className="w-[180px]" id="language-selector">
              <SelectValue placeholder={defaultLanguage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">typescript</SelectItem>
              <SelectItem value="javascript">javascript</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h2 className="text-xl pb-2">AI</h2>
          <div className="flex flex-col">
            <label className="opacity-70 text-sm pb-4" htmlFor="ai-model-selector">
              Select your preferred LLM and enter your credentials to use Srcbook&apos;s AI
              features.
            </label>
            <div className="flex items-center justify-between w-full mb-2 min-h-10">
              <div className="flex items-center gap-2">
                <Select onValueChange={setAiProvider}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={aiProvider} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">openai</SelectItem>
                    <SelectItem value="anthropic">anthropic</SelectItem>
                    <SelectItem value="custom">custom</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="w-[200px]"
                  id="ai-model-selector"
                  name="aiModel"
                  onChange={(e) => {
                    setModel(e.target.value);
                  }}
                  placeholder="AI model"
                  value={model}
                />
              </div>
              <AiInfoBanner />
            </div>

            {aiProvider === 'openai' && (
              <div className="flex gap-2">
                <Input
                  name="openaiKey"
                  onChange={(e) => {
                    setOpenaiKey(e.target.value);
                  }}
                  placeholder="openAI API key"
                  type="password"
                  value={openaiKey}
                />
                <Button
                  className="px-5"
                  disabled={!openaiKeySaveEnabled}
                  onClick={() => {
                    void (async () => {
                      await updateConfigContext({ openaiKey, aiModel: model });
                    })();
                  }}
                >
                  Save
                </Button>
              </div>
            )}

            {aiProvider === 'anthropic' && (
              <div className="flex gap-2">
                <Input
                  name="anthropicKey"
                  onChange={(e) => {
                    setAnthropicKey(e.target.value);
                  }}
                  placeholder="anthropic API key"
                  type="password"
                  value={anthropicKey}
                />
                <Button
                  className="px-5"
                  disabled={!anthropicKeySaveEnabled}
                  onClick={() => {
                    void (async () => {
                      await updateConfigContext({ anthropicKey, aiModel: model });
                    })();
                  }}
                >
                  Save
                </Button>
              </div>
            )}

            {aiProvider === 'custom' && (
              <div>
                <p className="opacity-70 text-sm mb-4">
                  If you want to use an openai-compatible model (for example when running local
                  models with Ollama), choose this option and set the baseUrl.
                </p>
                <div className="flex gap-2">
                  <Input
                    name="baseUrl"
                    onChange={(e) => {
                      setBaseUrl(e.target.value);
                    }}
                    placeholder="http://localhost:11434/v1"
                    value={baseUrl}
                  />
                  <Button
                    className="px-5"
                    disabled={!customModelSaveEnabled}
                    onClick={() => {
                      void (async () => {
                        await updateConfigContext({ aiBaseUrl: baseUrl, aiModel: model });
                      })();
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl pb-2">Base Directory</h2>
          <label className="opacity-70 text-sm" htmlFor="dir-picker">
            The default directory to look for Srcbooks when importing.
          </label>
          <DirPicker cta="Change" dirname={baseDir} entries={entries} />
        </div>
      </div>
    </div>
  );
}

function AiInfoBanner(): JSX.Element {
  const { aiEnabled, aiProvider } = useSettings();

  const fragments = (provider: AiProviderType): JSX.Element => {
    switch (provider) {
      case 'openai':
        return (
          <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
            <p>API key required</p>
            <a
              className="underline"
              href="https://platform.openai.com/api-keys"
              rel="noopener"
              target="_blank"
            >
              Go to {aiProvider}
            </a>
          </div>
        );

      case 'anthropic':
        return (
          <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
            <p>API key required</p>
            <a
              className="underline"
              href="https://console.anthropic.com/settings/keys"
              rel="noopener"
              target="_blank"
            >
              Go to {aiProvider}
            </a>
          </div>
        );

      case 'custom':
        return (
          <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
            <p>Base URL required</p>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center gap-1">
      {aiEnabled ? <TestAiButton /> : fragments(aiProvider)}
    </div>
  );
}

function TestAiButton(): JSX.Element {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const TIMEOUT = 2500;
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const timeout = setTimeout(() => {
        setState('idle');
      }, TIMEOUT);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [state]);

  const check = (): void => {
    setState('loading');
    aiHealthcheck()
      .then((res) => {
        setState(res.error ? 'error' : 'success');
      })
      .catch((err) => {
        console.error(err);
        setState('error');
      });
  };
  return (
    <>
      {state === 'idle' && (
        <div>
          <button
            className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:text-secondary-hover rounded-sm text-sm font-medium px-3 py-1"
            onClick={check}
            type="button"
          >
            Test AI config
          </button>
        </div>
      )}
      {state === 'loading' && (
        <div className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:text-secondary-hover rounded-sm text-sm font-medium px-3 py-1">
          <Loader2 className="animate-spin" size={16} />
          <p>Testing</p>
        </div>
      )}
      {state === 'success' && (
        <div className="flex items-center gap-2 bg-sb-green-20 text-sb-green-80 rounded-sm text-sm font-medium px-3 py-1 w-fit">
          <CircleCheck size={16} />
          <p>Success</p>
        </div>
      )}
      {state === 'error' && (
        <div className="flex items-center gap-2 bg-error text-error-foreground rounded-sm text-sm font-medium px-3 py-1 w-fit">
          <CircleX size={16} />
          <p>Error (check logs)</p>
        </div>
      )}
    </>
  );
}

Settings.loader = loader;
Settings.action = action;
export default Settings;
