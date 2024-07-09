import { generateText, GenerateTextResult } from 'ai';
import { readFileSync } from 'node:fs';
import Path from 'node:path';
import { createOpenAI } from '@ai-sdk/openai';
import { PROMPTS_DIR } from '../constants.mjs';
import { getConfig } from '../config.mjs';

const SYSTEM_PROMPT = readFileSync(Path.join(PROMPTS_DIR, 'srcbook-generator.txt'), 'utf-8');

type NoToolsGenerateTextResult = GenerateTextResult<{}>;
/*
 * Given a user request, which is free form text describing their intent,
 * generate a srcbook using an LLM.
 *
 * Currently, this uses openAI and the GPT-4o model, and throws if the
 * openAI API key is not set in the settings.
 * In the future, we can parameterize this with different models, to allow
 * users to use different providers like Anthropic or local ones.
 */
export async function generateSrcbook(query: string): Promise<NoToolsGenerateTextResult> {
  const config = await getConfig();
  if (!config.openAiApiKey) {
    throw new Error('OpenAI API key is not set');
  }

  const openai = createOpenAI({
    compatibility: 'strict', // strict mode, enable when using the OpenAI API
    // TODO get this from settings. Fallback to free model if unavailable
    apiKey: config.openAiApiKey,
  });

  const result = await generateText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    prompt: query,
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a srcbook, but finish_reason was not "stop":', result.finishReason);
  }
  return result;
}
