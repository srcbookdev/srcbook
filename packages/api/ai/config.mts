import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getConfig } from '../config.mjs';
import type { LanguageModel } from 'ai';
import { getDefaultModel, type AiProviderType } from '@srcbook/shared';

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
      });
      return openai(model);

    case 'anthropic':
      if (!config.anthropicKey) {
        throw new Error('Anthropic API key is not set');
      }
      const anthropic = createAnthropic({ apiKey: config.anthropicKey });
      return anthropic(model);

    case 'Gemini':
      if (!config.geminiKey) {
        throw new Error('Gemini API key is not set');
      }
      const gemini = createOpenAI({
        compatibility: 'compatible',
        baseURL:
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=',
        apiKey: config.geminiKey,
      });
      return gemini(model);

    case 'Xai':
      if (!config.xaiKey) {
        throw new Error('Xai API key is not set');
      }
      const xai = createOpenAI({
        compatibility: 'compatible',
        baseURL: 'https://api.x.ai/v1',
        apiKey: config.xaiKey,
      });
      return xai(model);

    case 'custom':
      if (typeof aiBaseUrl !== 'string') {
        throw new Error('Local AI base URL is not set');
      }
      const openaiCompatible = createOpenAI({
        compatibility: 'compatible',
        apiKey: 'bogus', // required but unused
        baseURL: aiBaseUrl,
      });
      return openaiCompatible(model);
  }
}
