import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getConfig } from '../config.mjs';
import type { LanguageModel } from 'ai';
import { getDefaultModel, type AiProviderType } from '@srcbook/shared';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

function convertConfigHeaders(headers: Array<{key: string, value: string}>) {
  return headers.reduce((acc: Record<string, string>, header: {key: string, value: string}) => ({
    ...acc,
    [header.key]: header.value,
  }), {});
}

/**
 * Get the correct client and model configuration.
 * Throws an error if the given API key is not set in the settings.
 */
export async function getModel(): Promise<LanguageModel> {
  const config = await getConfig();
  const { aiModel, aiProvider, aiBaseUrl } = config;
  const model = aiModel || getDefaultModel(aiProvider as AiProviderType);
  switch (aiProvider as AiProviderType) {
    case 'openai':
      if (!config.openaiKey) {
        throw new Error('OpenAI API key is not set');
      }
      const openai = createOpenAI({
        compatibility: 'strict', // strict mode, enabled when using the OpenAI API
        apiKey: config.openaiKey,
        headers: convertConfigHeaders(JSON.parse(config.openaiHeaders || '[]')),
      });
      return openai(model);

    case 'anthropic':
      if (!config.anthropicKey) {
        throw new Error('Anthropic API key is not set');
      }
      const anthropic = createAnthropic({
        apiKey: config.anthropicKey,
        headers: convertConfigHeaders(JSON.parse(config.anthropicHeaders || '[]')),
      });
      return anthropic(model);

    case 'Gemini':
      if (!config.geminiKey) {
        throw new Error('Gemini API key is not set');
      }
      const google = createGoogleGenerativeAI({
        apiKey: config.geminiKey,
        headers: convertConfigHeaders(JSON.parse(config.geminiHeaders || '[]')),
      });
      return google(model) as LanguageModel;

    case 'Xai':
      if (!config.xaiKey) {
        throw new Error('Xai API key is not set');
      }
      const xai = createOpenAI({
        compatibility: 'compatible',
        baseURL: 'https://api.x.ai/v1',
        apiKey: config.xaiKey,
        headers: convertConfigHeaders(JSON.parse(config.xaiHeaders || '[]')),
      });
      return xai(model);

    case 'custom':
      if (typeof aiBaseUrl !== 'string') {
        throw new Error('Local AI base URL is not set');
      }
      const openaiCompatible = createOpenAI({
        compatibility: 'compatible',
        apiKey: config.customApiKey || 'bogus', // use custom API key if set, otherwise use a bogus key
        baseURL: aiBaseUrl,
        headers: convertConfigHeaders(JSON.parse(config.customHeaders || '[]')),
      });
      return openaiCompatible(model);
  }
}
