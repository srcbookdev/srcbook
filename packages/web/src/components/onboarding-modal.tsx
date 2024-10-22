import React, { useState, useEffect } from 'react';
import { LayoutGrid, FileText, Loader2, CircleCheck, CircleX } from 'lucide-react';
import { Button } from '../../../components/src/components/ui/button';
import { Input } from '../../../components/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/src/components/ui/select';
import { AiProviderType, getDefaultModel } from '@srcbook/shared';
import { aiHealthcheck } from '@/lib/server';

interface OnboardingModalProps {
  onComplete: (apiKey: string) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [aiProvider, setAiProvider] = useState<AiProviderType>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(getDefaultModel('anthropic'));

  const handleContinue = () => {
    if (apiKey.trim()) {
      onComplete(apiKey);
    }
  };

  const handleAiProviderChange = (provider: AiProviderType) => {
    setAiProvider(provider);
    setModel(getDefaultModel(provider));
  };

  return (
    <div className="rounded-lg flex flex-col gap-6 max-w-3xl w-full overflow-y-auto py-12">
      <div>
        <h2 className="text-3xl font-medium mb-2">Welcome to Srcbook!</h2>
        <p>Srcbook is an AI-powered TypeScript app builder and interactive playground.</p>
      </div>
      <div>
        <h4 className="font-medium mb-3">With Srcbook you can:</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<LayoutGrid size={24} className="text-ai-btn" />}
            title="App builder"
            description="Create Web Applications with the speed of thinking"
            bgImage="bg-[url('/public/feature-gradient.png')]"
            textColor="text-ai-btn"
            descriptionColor="text-ai-btn"
          />
          <FeatureCard
            icon={<FileText size={24} className="text-button-secondary" />}
            title="Notebook"
            description="Experimenting without the hassle of setting up environments"
            bgImage="bg-code-bg"
            textColor="text-primary"
            descriptionColor="text-primary"
            border="border border-border"
          />
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="aiProvider" className="block font-medium mb-3">
          To get started, select your AI provider and enter your API key:
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Select onValueChange={handleAiProviderChange} value={aiProvider}>
              <SelectTrigger id="ai-provider-selector" className="w-[180px]">
                <SelectValue placeholder={aiProvider} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
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
          <div className="flex gap-2 mb-3">
            <Input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
              placeholder={`${aiProvider} API Key`}
            />
            <TestAiButton apiKey={apiKey} aiProvider={aiProvider} model={model} />
          </div>
        </div>
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgImage: string;
  textColor: string;
  descriptionColor: string;
  border?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  bgImage,
  textColor,
  descriptionColor,
  border,
}) => (
  <div className={`${bgImage} ${border} p-5 rounded-lg`}>
    <div className="flex items-center mb-6">{icon}</div>
    <h3 className={`${textColor} font-medium mt-3`}>{title}</h3>
    <p className={`${descriptionColor} mt-2`}>{description}</p>
  </div>
);

const TestAiButton: React.FC<{ apiKey: string; aiProvider: AiProviderType; model: string }> = ({
  apiKey,
  aiProvider,
  model,
}) => {
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
    aiHealthcheck(apiKey, aiProvider, model)
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
        <Button
          className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:text-secondary-hover rounded-sm text-sm font-medium px-3 py-1"
          onClick={check}
          disabled={!apiKey}
        >
          Test AI config
        </Button>
      )}
      {state === 'loading' && (
        <Button
          className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:text-secondary-hover rounded-sm text-sm font-medium px-3 py-1"
          disabled
        >
          <Loader2 size={16} className="animate-spin" />
          <p>Testing</p>
        </Button>
      )}
      {state === 'success' && (
        <Button
          className="flex items-center gap-2 bg-sb-green-20 text-sb-green-80 rounded-sm text-sm font-medium px-3 py-1 w-fit"
          disabled
        >
          <CircleCheck size={16} />
          <p>Success</p>
        </Button>
      )}
      {state === 'error' && (
        <Button
          className="flex items-center gap-2 bg-error text-error-foreground rounded-sm text-sm font-medium px-3 py-1 w-fit"
          disabled
        >
          <CircleX size={16} />
          <p>Error</p>
        </Button>
      )}
    </>
  );
};

export default OnboardingModal;
