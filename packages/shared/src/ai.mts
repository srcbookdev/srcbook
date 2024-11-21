export const AiProvider = {
  OpenAI: 'openai',
  Anthropic: 'anthropic',
  XAI: 'Xai',
  Gemini: 'Gemini',
  Custom: 'custom',
} as const;

export type AiProviderType = (typeof AiProvider)[keyof typeof AiProvider];

export const defaultModels: Record<AiProviderType, string> = {
  [AiProvider.OpenAI]: 'chatgpt-4o-latest',
  [AiProvider.Anthropic]: 'claude-3-5-sonnet-latest',
  [AiProvider.Custom]: 'mistral-nemo',
  [AiProvider.XAI]: 'grok-beta',
  [AiProvider.Gemini]: 'google-developer-ai',
} as const;

export function isValidProvider(provider: string): provider is AiProviderType {
  return Object.values(AiProvider).includes(provider as AiProviderType);
}

export function getDefaultModel(provider: AiProviderType): string {
  return defaultModels[provider];
}
