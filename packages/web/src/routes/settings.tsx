import { useState } from 'react';
import { disk, getConfig, updateConfig } from '@/lib/server';
import { type CodeLanguageType } from '@srcbook/shared';
import type { SettingsType, FsObjectResultType } from '@/types';
import { useLoaderData, useRevalidator } from 'react-router-dom';
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
    openaiKey: config.openaiKey,
    enabledAnalytics: config.enabledAnalytics,
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
    openaiKey: configOpenaiKey,
    entries,
    baseDir,
    defaultLanguage,
    enabledAnalytics: configEnabledAnalytics,
  } = useLoaderData() as SettingsType & FsObjectResultType;

  const revalidator = useRevalidator();

  const [openaiKey, setOpenaiKey] = useState<string>(configOpenaiKey ?? '');
  const [enabledAnalytics, setEnabledAnalytics] = useState(configEnabledAnalytics);

  const updateDefaultLanguage = (value: CodeLanguageType) => {
    updateConfig({ defaultLanguage: value });
  };

  const updateOpenaiKey = async () => {
    await updateConfig({ openaiKey });
    revalidator.revalidate();
  };

  const { theme, toggleTheme } = useTheme();

  // Either the key from the server is null/undefined and the user entered input
  // or the key from the server is a string and the user entered input is different.
  const openaiKeySaveEnabled =
    (typeof configOpenaiKey === 'string' && openaiKey !== configOpenaiKey) ||
    ((configOpenaiKey === null || configOpenaiKey === undefined) && openaiKey.length > 0);

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
          <h2 className="text-xl pb-2">OpenAI API key</h2>
          <div className="flex flex-col gap-1">
            <label className="opacity-70">
              Enter your openAI API key to use AI features of Srcbook. Get one{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                className="underline font-medium"
              >
                here
              </a>
              .
            </label>
            <div className="flex gap-2">
              <Input
                name="openaiKey"
                placeholder="API key"
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <Button className="px-5" onClick={updateOpenaiKey} disabled={!openaiKeySaveEnabled}>
                Save
              </Button>
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
