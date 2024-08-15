import { useState } from 'react';
import { CircleCheck, Loader2, CircleX } from 'lucide-react';
import { disk, updateConfig, aiHealthcheck } from '@/lib/server';
import { useSettings } from '@/components/use-settings';
import { AiProviderType, getDefaultModel, type CodeLanguageType } from '@srcbook/shared';
import type { SettingsType, FsObjectResultType } from '@/types';
import { useLoaderData } from 'react-router-dom';
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

async function loader() {
  const { result: diskResult } = await disk({});

  return {
    ...diskResult,
  };
}

async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const baseDir = formData.get('path') as string | undefined;
  await updateConfig({ baseDir });
  return null;
}

function Settings() {
  const { entries, baseDir } = useLoaderData() as SettingsType & FsObjectResultType;
  const {
    aiProvider,
    aiModel,
    aiBaseUrl,
    openaiKey: configOpenaiKey,
    anthropicKey: configAnthropicKey,
    updateConfig: updateConfigContext,
    defaultLanguage,
    enabledAnalytics: configEnabledAnalytics,
  } = useSettings();

  const [openaiKey, setOpenaiKey] = useState<string>(configOpenaiKey ?? '');
  const [anthropicKey, setAnthropicKey] = useState<string>(configAnthropicKey ?? '');
  const [enabledAnalytics, setEnabledAnalytics] = useState(configEnabledAnalytics);
  const [model, setModel] = useState<string>(aiModel);
  const [baseUrl, setBaseUrl] = useState<string>(aiBaseUrl || '');

  const updateDefaultLanguage = (value: CodeLanguageType) => {
    updateConfigContext({ defaultLanguage: value });
  };

  const setAiProvider = (provider: AiProviderType) => {
    const model = getDefaultModel(provider);
    setModel(model);
    updateConfigContext({ aiProvider: provider, aiModel: model });
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
      <h1 className="text-4xl pb-4">Settings</h1>
      <div className="space-y-10">
        <div>
          <h2 className="text-xl pb-2">Base Directory</h2>
          <label className="opacity-70 text-sm">
            The default directory to look for Srcbooks when importing.
          </label>
          <DirPicker dirname={baseDir} entries={entries} cta="Change" />
        </div>

        <div>
          <h2 className="text-xl pb-2">Theme</h2>
          <label className="opacity-70 text-sm">
            Select light or dark mode for the Srcbook app.
          </label>
          <div className="flex items-center gap-2 mt-4">
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            <label>Dark mode</label>
          </div>
        </div>

        <div>
          <h2 className="text-xl pb-2">Default Language</h2>
          <label className="opacity-70 block pb-4 text-sm">
            The default language to use when creating new Srcbooks.
          </label>
          <Select onValueChange={updateDefaultLanguage}>
            <SelectTrigger className="w-[180px]">
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
            <label className="opacity-70 text-sm pb-4">
              Select your preferred LLM and enter your credentials to use Srcbook's AI features.
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
                  name="aiModel"
                  className="w-[200px]"
                  placeholder="AI model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <AiInfoBanner />
            </div>

            {aiProvider === 'openai' && (
              <div className="flex gap-2">
                <Input
                  name="openaiKey"
                  placeholder="openAI API key"
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <Button
                  className="px-5"
                  onClick={() => updateConfigContext({ openaiKey, aiModel: model })}
                  disabled={!openaiKeySaveEnabled}
                >
                  Save
                </Button>
              </div>
            )}

            {aiProvider === 'anthropic' && (
              <div className="flex gap-2">
                <Input
                  name="anthropicKey"
                  placeholder="anthropic API key"
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                <Button
                  className="px-5"
                  onClick={() => updateConfigContext({ anthropicKey, aiModel: model })}
                  disabled={!anthropicKeySaveEnabled}
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
                    placeholder="http://localhost:11434/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                  <Button
                    className="px-5"
                    onClick={() => updateConfigContext({ aiBaseUrl: baseUrl, aiModel: model })}
                    disabled={!customModelSaveEnabled}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl pb-2">Analytics tracking</h2>
          <label className="opacity-70 block pb-4 text-sm">
            We track behavioral analytics to improve Srcbook. We do not track any personally
            identifiable information (PII).
          </label>
          <div className="flex items-center gap-2">
            <Switch
              checked={enabledAnalytics}
              onCheckedChange={() => {
                setEnabledAnalytics(!enabledAnalytics);
                updateConfigContext({ enabledAnalytics: !enabledAnalytics });
              }}
            />
            <label>{enabledAnalytics ? 'enabled' : 'disabled'}</label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiInfoBanner() {
  const { aiEnabled, aiProvider } = useSettings();

  const fragments = (provider: AiProviderType) => {
    switch (provider) {
      case 'openai':
        return (
          <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
            <p>API key required</p>
            <a href="https://platform.openai.com/api-keys" target="_blank" className="underline">
              Go to {aiProvider}
            </a>
          </div>
        );

      case 'anthropic':
        return (
          <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
            <p>API key required</p>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              className="underline"
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

const TestAiButton = () => {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const TIMEOUT = 2500;
  const check = () => {
    setState('loading');
    aiHealthcheck()
      .then((res) => {
        setState(res.error ? 'error' : 'success');
        setTimeout(() => setState('idle'), TIMEOUT);
      })
      .catch((err) => {
        console.error(err);
        setState('error');
        setTimeout(() => setState('idle'), TIMEOUT);
      });
  };
  return (
    <>
      {state === 'idle' && (
        <div className="flex items-center gap-2 bg-ai-btn text-sb-core-0 rounded-sm text-sm font-medium px-3 py-1 w-fit">
          <button onClick={check}>Test AI config</button>
        </div>
      )}
      {state === 'loading' && (
        <div className="flex items-center gap-2 bg-ai-btn text-sb-core-0 rounded-sm text-sm font-medium px-3 py-1 w-fit">
          <Loader2 size={16} className="animate-spin" />
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
};

Settings.loader = loader;
Settings.action = action;
export default Settings;
