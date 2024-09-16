export const AiProvider = {
  OpenAI: 'openai',
  Anthropic: 'anthropic',
  Custom: 'custom',
} as const;

export type AiProviderType = (typeof AiProvider)[keyof typeof AiProvider];

export const defaultModels: Record<AiProviderType, string> = {
  [AiProvider.OpenAI]: 'chatgpt-4o-latest',
  [AiProvider.Anthropic]: 'claude-3-5-sonnet-20240620',
  [AiProvider.Custom]: 'mistral-nemo',
} as const;

export function isValidProvider(provider: string): provider is AiProviderType {
  return Object.values(AiProvider).includes(provider as AiProviderType);
}

export function getDefaultModel(provider: AiProviderType): string {
  return defaultModels[provider];
}
