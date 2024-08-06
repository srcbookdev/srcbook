import { useState } from 'react';
import { disk, getConfig, updateConfig } from '@/lib/server';
import { useAiConfig } from '@/components/use-ai-config';
import { type CodeLanguageType } from '@srcbook/shared';
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
  const [{ result: config }, { result: diskResult }] = await Promise.all([getConfig(), disk({})]);

  return {
    defaultLanguage: config.defaultLanguage,
    baseDir: config.baseDir,
    enabledAnalytics: config.enabledAnalytics,
    aiConfig: config.aiConfig,
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
  const {
    entries,
    baseDir,
    defaultLanguage,
    enabledAnalytics: configEnabledAnalytics,
  } = useLoaderData() as SettingsType & FsObjectResultType;
  const {
    aiConfig,
    openaiKey: configOpenaiKey,
    anthropicKey: configAnthropicKey,
    setOpenaiKey: configSetOpenaiKey,
    setAnthropicKey: configSetAnthropicKey,
    setProvider,
  } = useAiConfig();

  const [openaiKey, setOpenaiKey] = useState<string>(configOpenaiKey ?? '');
  const [anthropicKey, setAnthropicKey] = useState<string>(configAnthropicKey ?? '');
  const [enabledAnalytics, setEnabledAnalytics] = useState(configEnabledAnalytics);

  const updateDefaultLanguage = (value: CodeLanguageType) => {
    updateConfig({ defaultLanguage: value });
  };

  const { theme, toggleTheme } = useTheme();

  // Either the key from the server is null/undefined and the user entered input
  // or the key from the server is a string and the user entered input is different.
  const openaiKeySaveEnabled =
    (typeof configOpenaiKey === 'string' && openaiKey !== configOpenaiKey) ||
    ((configOpenaiKey === null || configOpenaiKey === undefined) && openaiKey.length > 0);

  const anthropicKeySaveEnabled =
    (typeof configAnthropicKey === 'string' && anthropicKey !== configAnthropicKey) ||
    ((configAnthropicKey === null || configAnthropicKey === undefined) && anthropicKey.length > 0);

  return (
    <div>
      <h1 className="text-4xl pb-4">Settings</h1>
      <div className="space-y-10">
        <div>
          <h2 className="text-xl pb-2">Base Directory</h2>
          <label className="opacity-70">
            The default directory to look for Srcbooks when importing.
          </label>
          <DirPicker dirname={baseDir} entries={entries} cta="Change" />
        </div>

        <div>
          <h2 className="text-xl pb-2">Theme</h2>
          <div className="flex items-center gap-2">
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            <label>Dark mode</label>
          </div>
        </div>

        <div>
          <h2 className="text-xl pb-2">Default Language</h2>
          <label className="opacity-70 block pb-2">
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
          <div className="flex flex-col gap-1">
            <label className="opacity-70">
              Select your preferred LLM and enter your credentials to use Srcbook's AI features.
            </label>
            <div className="space-y-2">
              <Select onValueChange={setProvider}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={aiConfig.provider} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">openai</SelectItem>
                  <SelectItem value="anthropic">anthropic</SelectItem>
                </SelectContent>
              </Select>

              {aiConfig.provider === 'openai' && (
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
                    onClick={() => configSetOpenaiKey(openaiKey)}
                    disabled={!openaiKeySaveEnabled}
                  >
                    Save
                  </Button>
                </div>
              )}

              {aiConfig.provider === 'anthropic' && (
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
                    onClick={() => configSetAnthropicKey(anthropicKey)}
                    disabled={!anthropicKeySaveEnabled}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl pb-2">Analytics tracking</h2>
          <label className="opacity-70 block pb-2">
            We track behavioral analytics to improve Srcbook. We do not track any personally
            identifiable information (PII).
          </label>
          <div className="flex items-center gap-2">
            <Switch
              checked={enabledAnalytics}
              onCheckedChange={() => {
                setEnabledAnalytics(!enabledAnalytics);
                updateConfig({ enabledAnalytics: !enabledAnalytics });
              }}
            />
            <label>{enabledAnalytics ? 'enabled' : 'disabled'}</label>
          </div>
        </div>
      </div>
    </div>
  );
}

Settings.loader = loader;
Settings.action = action;
export default Settings;
