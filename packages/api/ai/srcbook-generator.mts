import { generateText } from 'ai';
import { readFileSync } from 'node:fs';
import Path from 'node:path';
import { createOpenAI } from '@ai-sdk/openai';
import { PROMPTS_DIR } from '../constants.mjs';

const openai = createOpenAI({
  compatibility: 'strict', // strict mode, enable when using the OpenAI API
  // TODO get this from settings. Fallback to free model if unavailable
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = readFileSync(Path.join(PROMPTS_DIR, 'srcbook-generator.txt'), 'utf-8');
/*
 * Given a user request, which is free form text describing their intent,
 * generate a srcbook using LLMs.
 */
export async function generateSrcbook(query: string) {
  const result = await generateText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    prompt: query,
  });

  // TODO handle finish_reasons that aren't 'stop'. In particular, handle 'length'
  console.log('Generated a srcbook, finish_reason:', result.finishReason);
  return result;
}
