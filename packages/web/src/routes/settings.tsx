import { useMemo, useReducer, useEffect, useState } from 'react';
import { CircleCheck, Loader2, CircleX } from 'lucide-react';
import { aiHealthcheck, subscribeToMailingList } from '@/lib/server';
import { useSettings } from '@/components/use-settings';
import AiModelHeaders, { AiModelHeader } from '@/components/settings/ai-model-headers';
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

const ModelProviders = [
  {
    name: 'openai',
    apiKeyLink: 'https://platform.openai.com/api-keys',
    inputs: [
      {
        name: 'openaiKey',
        placeholder: 'openAI API key',
        type: 'password',
      },
    ],
  },
  {
    name: 'anthropic',
    apiKeyLink: 'https://console.anthropic.com/settings/keys',
    inputs: [
      {
        name: 'anthropicKey',
        placeholder: 'anthropic API key',
        type: 'password',
      },
    ],
  },
  {
    name: 'Xai',
    inputs: [
      {
        name: 'xaiKey',
        placeholder: 'xai API key',
        type: 'password',
      },
    ],
  },
  {
    name: 'Gemini',
    inputs: [
      {
        name: 'geminiKey',
        placeholder: 'Gemini API key',
        type: 'password',
      },
    ],
  },
  {
    name: 'custom',
    info: 'If you want to use an openai-compatible model (for example when running local models with Ollama or using a third party like togetherAI), choose this option and set the baseUrl. Optionally add an API key if needed.',
    inputs: [
      {
        name: 'baseUrl',
        placeholder: 'http://localhost:11434/v1',
        type: 'text',
      },
      {
        name: 'customApiKey',
        placeholder: 'API key (optional)',
        type: 'password',
      },
    ],
  },
];

function Settings() {
  const { updateConfig: updateConfigContext, defaultLanguage, subscriptionEmail } = useSettings();

  const isSubscribed = subscriptionEmail && subscriptionEmail !== 'dismissed';

  const [email, setEmail] = useState<string>(isSubscribed ? subscriptionEmail : '');

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
      </div>
    </div>
  );
}

function AiInfoBanner() {
  const { aiEnabled, aiProvider } = useSettings();
  const modelProvider = ModelProviders.find((p) => p.name === aiProvider);

  return (
    <div className="flex items-center gap-1">
      {aiEnabled ? <TestAiButton /> : (
        <div className="flex items-center gap-10 bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
          <p>API key required</p>
          {modelProvider?.apiKeyLink && (
            <a href={modelProvider.apiKeyLink} target="_blank" className="underline">
              Go to {aiProvider}
            </a>
          )}
        </div>
      )}
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
  const settings: any = useSettings();
  const {
    aiProvider,
    updateConfig: updateConfigContext,
  } = settings;

  const [state, updateState] = useReducer(
    (state: any, action: any) => ({ ...state, formChanged: true, ...action }),
    settings,
  );

  const setAiProvider = (provider: AiProviderType) => {
    const model = getDefaultModel(provider);
    updateState({ aiProvider: provider, aiModel: model, formChanged: false });
    updateConfigContext({ aiProvider: provider, aiModel: model });
  };

  const { modelProvider, isEnabled } = useMemo(() => {
    const modelProvider = ModelProviders.find((p) => p.name === aiProvider);
    const modelProviderInputs = modelProvider?.inputs || [];

    const isEnabled = modelProviderInputs.every(input => {
      const value = state[input.name] ?? '';
      const configValue = settings[input.name];

      const hasValidKey = typeof configValue === 'string' && value !== configValue;
      const hasNewKey = !configValue && value.length > 0; 
      const hasModelChange = state.formChanged && state.aiModel !== settings.aiModel;
      const hasHeadersChange = state.formChanged && state[`${aiProvider}Headers`] !== settings[`${aiProvider}Headers`]
        && JSON.parse(state[`${aiProvider}Headers`] ?? '[]').every((header: AiModelHeader) => header.key !== '' && header.value !== '');
    
      return hasValidKey || hasNewKey || hasModelChange || hasHeadersChange;
    });

    return { modelProvider, isEnabled };
  }, [state, settings]);

  const updateConfig = () => {
    const data = (modelProvider?.inputs || []).reduce((acc, input) => ({
      ...acc,
      [input.name]: state[input.name],
    }), {
      aiModel: state.aiModel,
      [`${aiProvider}Headers`]: state[`${aiProvider}Headers`],
    });

    updateConfigContext(data);
  }

  return (
    <>
      <div className="flex items-center justify-between w-full mb-2 min-h-10">
        <div className="flex items-center gap-2">
          <Select onValueChange={setAiProvider} value={state.aiProvider ?? ''}>
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
            value={state.aiModel ?? ''}
            onChange={(e) => updateState({ aiModel: e.target.value })}
          />
        </div>
        <AiInfoBanner />
      </div>

      {modelProvider && (
        <div className="flex flex-col gap-2">
          {modelProvider.info && (
            <p className="opacity-70 text-sm mb-4">
              {modelProvider.info}
            </p>
          )}
          <div className="flex gap-2">
            {modelProvider.inputs.map((input, key) => (
              <Input
                {...input}
                key={key}
                value={state[input.name] ?? ''}
                onChange={(e) => updateState({ [input.name]: e.target.value })}
              />
            ))}
          </div>
          <h3 className="text-sm font-medium mt-2">Model Headers</h3>
          <div className="flex flex-col gap-2">
            {modelProvider && (
              <AiModelHeaders
                value={JSON.parse(state[`${aiProvider}Headers`] ?? '[]')}
                onChange={(value) => updateState({ [`${aiProvider}Headers`]: JSON.stringify(value) })}
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button
              className="px-5"
              onClick={updateConfig}
              disabled={!isEnabled}
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
