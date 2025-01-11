import { useEffect, useState } from 'react';
import { CircleCheck, Loader2, CircleX } from 'lucide-react';
import { aiHealthcheck, subscribeToMailingList } from '@/lib/server';
import { useSettings } from '@/components/use-settings';
import { AiProviderType, getDefaultModel, type CodeLanguageType } from '@srcbook/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@srcbook/components/src/components/ui/select';
import { Input } from '@srcbook/components/src/components/ui/input';
import useTheme from '@srcbook/components/src/components/use-theme';
import { Switch } from '@srcbook/components/src/components/ui/switch';
import { Button } from '@srcbook/components/src/components/ui/button';
import { toast } from 'sonner';

function Settings() {
  const { updateConfig: updateConfigContext, defaultLanguage, subscriptionEmail } = useSettings();

  const isSubscribed = subscriptionEmail && subscriptionEmail !== 'dismissed';

  const [email, setEmail] = useState<string>(isSubscribed ? subscriptionEmail : '');

  // Point to the config file in the project root
  const mcpConfigPath = '/app/srcbook_mcp_config.json';

  const updateDefaultLanguage = (value: CodeLanguageType) => {
    updateConfigContext({ defaultLanguage: value });
  };

  const { theme, toggleTheme } = useTheme();

  const handleSubscribe = async () => {
    try {
      const response = await subscribeToMailingList(email);
      if (response.success) {
        await updateConfigContext({ subscriptionEmail: email });
        toast.success('Subscribed successfully!');
      } else {
        toast.error('There was an error subscribing to the mailing list. Please try again later.');
      }
    } catch (error) {
      toast.error('There was an error subscribing to the mailing list. Please try again later.');
      console.error('Subscription error:', error);
    }
  };

  /**
   * Opens the MCP config file in the system's file manager
   */
  const openMcpConfig = async () => {
    try {
      const response = await fetch('/api/open-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: mcpConfigPath }),
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.result);
      }

      // If we're in a containerized environment, handle the path differently
      if (data.containerized) {
        // Copy the path to clipboard
        await navigator.clipboard.writeText(data.result);
        toast.success('Path copied to clipboard');
        
        // Show instructions
        toast.message(
          'To find your config file:\n' +
          '1. Open Finder\n' +
          '2. Press Cmd+Shift+G\n' +
          '3. Paste the copied path'
        );
      }
    } catch (error) {
      console.error('Failed to open MCP config:', error);
      toast.error('Failed to open MCP config file');
    }
  };

  return (
    <div>
      <h4 className="h4 mx-auto mb-6">Settings</h4>
      <div className="space-y-10">
        <div>
          <h2 className="text-base font-medium">Theme</h2>
          <label className="opacity-70 text-sm" htmlFor="theme-switch">
            Select light or dark mode for the Srcbook app.
          </label>
          <div className="flex items-center gap-2 mt-2">
            <Switch id="theme-switch" checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            <label htmlFor="theme-switch">
              <span className="text-sm font-medium">Dark mode</span>
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium">Default Language</h2>
          <label className="opacity-70 block pb-3 text-sm" htmlFor="language-selector">
            The default language to use when creating new Srcbooks.
          </label>
          <Select onValueChange={updateDefaultLanguage}>
            <SelectTrigger id="language-selector" className="w-[180px]">
              <SelectValue
                placeholder={defaultLanguage === 'typescript' ? 'TypeScript' : 'JavaScript'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h2 className="text-base font-medium">AI</h2>
          <div className="flex flex-col">
            <label className="opacity-70 text-sm pb-3" htmlFor="ai-provider-selector">
              Select your preferred LLM and enter your credentials to use Srcbook's AI features.
            </label>
          </div>
          <AiSettings />
        </div>

        <div>
          <h2 className="text-base font-medium">Get product updates</h2>
          <div>
            <label className="opacity-70 text-sm" htmlFor="mailing-list-email">
              Subscribe to our mailing list to get the latest updates, early access features, and
              expert tips delivered to your inbox.
            </label>
            <div className="flex gap-2 mt-3">
              <Input
                id="mailing-list-email"
                type="text"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button className="px-5" onClick={handleSubscribe}>
                {isSubscribed ? 'Update' : 'Subscribe'}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium">MCP Configuration</h2>
          <div>
            <label className="opacity-70 text-sm" htmlFor="mcp-config">
              Configure Model Context Protocol settings by editing the config file.
            </label>
            <div className="flex gap-2 mt-3">
              <Button
                id="mcp-config"
                className="px-5"
                onClick={openMcpConfig}
              >
                Edit MCP Config
              </Button>
            </div>
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

      case 'Xai':
        return (
          <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
            <p>API key required</p>
          </div>
        );

      case 'Gemini':
        return (
          <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
            <p>API key required</p>
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
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const timeout = setTimeout(() => setState('idle'), TIMEOUT);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  const check = () => {
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
          >
            Test AI config
          </button>
        </div>
      )}
      {state === 'loading' && (
        <div className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:text-secondary-hover rounded-sm text-sm font-medium px-3 py-1">
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

type AiSettingsProps = {
  saveButtonLabel?: string;
};

export function AiSettings({ saveButtonLabel }: AiSettingsProps) {
  const {
    aiProvider,
    aiModel,
    aiBaseUrl,
    openaiKey: configOpenaiKey,
    anthropicKey: configAnthropicKey,
    xaiKey: configXaiKey,
    geminiKey: configGeminiKey,
    updateConfig: updateConfigContext,
  } = useSettings();

  const [openaiKey, setOpenaiKey] = useState<string>(configOpenaiKey ?? '');
  const [anthropicKey, setAnthropicKey] = useState<string>(configAnthropicKey ?? '');
  const [xaiKey, setXaiKey] = useState<string>(configXaiKey ?? '');
  const [geminiKey, setGeminiKey] = useState<string>(configGeminiKey ?? '');
  const [model, setModel] = useState<string>(aiModel);
  const [baseUrl, setBaseUrl] = useState<string>(aiBaseUrl || '');

  const setAiProvider = (provider: AiProviderType) => {
    const model = getDefaultModel(provider);
    setModel(model);
    updateConfigContext({ aiProvider: provider, aiModel: model });
  };

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

  const xaiKeySaveEnabled =
    (typeof configXaiKey === 'string' && xaiKey !== configXaiKey) ||
    ((configXaiKey === null || configXaiKey === undefined) && xaiKey.length > 0) ||
    model !== aiModel;

  const geminiKeySaveEnabled =
    (typeof configGeminiKey === 'string' && geminiKey !== configXaiKey) ||
    ((configGeminiKey === null || configGeminiKey === undefined) && geminiKey.length > 0) ||
    model !== aiModel;

  const customModelSaveEnabled =
    (typeof aiBaseUrl === 'string' && baseUrl !== aiBaseUrl) ||
    ((aiBaseUrl === null || aiBaseUrl === undefined) && baseUrl.length > 0) ||
    model !== aiModel;

  return (
    <>
      <div className="flex items-center justify-between w-full mb-2 min-h-10">
        <div className="flex items-center gap-2">
          <Select onValueChange={setAiProvider}>
            <SelectTrigger id="ai-provider-selector" className="w-[180px]">
              <SelectValue placeholder={aiProvider} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">openai</SelectItem>
              <SelectItem value="anthropic">anthropic</SelectItem>
              <SelectItem value="Xai">Xai</SelectItem>
              <SelectItem value="Gemini">Gemini</SelectItem>
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
            {saveButtonLabel ?? 'Save'}
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
            {saveButtonLabel ?? 'Save'}
          </Button>
        </div>
      )}

      {aiProvider === 'Xai' && (
        <div className="flex gap-2">
          <Input
            name="xaiKey"
            placeholder="xai API key"
            type="password"
            value={xaiKey}
            onChange={(e) => setXaiKey(e.target.value)}
          />
          <Button
            className="px-5"
            onClick={() => updateConfigContext({ xaiKey, aiModel: model })}
            disabled={!xaiKeySaveEnabled}
          >
            {saveButtonLabel ?? 'Save'}
          </Button>
        </div>
      )}

      {aiProvider === 'Gemini' && (
        <div className="flex gap-2">
          <Input
            name="geminiKey"
            placeholder="Gemini API key"
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
          <Button
            className="px-5"
            onClick={() => updateConfigContext({ geminiKey, aiModel: model })}
            disabled={!geminiKeySaveEnabled}
          >
            {saveButtonLabel ?? 'Save'}
          </Button>
        </div>
      )}

      {aiProvider === 'custom' && (
        <div>
          <p className="opacity-70 text-sm mb-4">
            If you want to use an openai-compatible model (for example when running local models
            with Ollama), choose this option and set the baseUrl.
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
              {saveButtonLabel ?? 'Save'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;
