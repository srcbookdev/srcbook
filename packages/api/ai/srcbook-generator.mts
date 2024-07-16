import { generateText, GenerateTextResult } from 'ai';
import { type CodeLanguageType, type CellType } from '@srcbook/shared';
import { type SessionType } from '../types.mjs';
import { readFileSync } from 'node:fs';
import Path from 'node:path';
import { createOpenAI } from '@ai-sdk/openai';
import { PROMPTS_DIR } from '../constants.mjs';
import { encode, decodePartial } from '../srcmd.mjs';
import { getConfig } from '../config.mjs';

const OPENAI_MODEL = 'gpt-4o';

const makeGenerateSrcbookSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'srcbook-generator.txt'), 'utf-8');
};

const makeGenerateCellSystemPrompt = (language: CodeLanguageType) => {
  switch (language) {
    case 'javascript':
      throw new Error('Not implemented');
    case 'typescript':
      return readFileSync(Path.join(PROMPTS_DIR, 'cell-generator-typescript.txt'), 'utf-8');
  }
};

const makeGenerateCellUserPrompt = (session: SessionType, insertIdx: number, query: string) => {
  const inlineSrcbookWithPlaceholder = encode(session.cells, session.metadata, {
    inline: true,
    insertCellIdx: insertIdx,
  });

  const prompt = `==== BEGIN SRCBOOK ====
${inlineSrcbookWithPlaceholder}
==== END SRCBOOK ====

==== USER REQUEST ====
${query}
==== END USER REQUEST ====`;
  return prompt;
};

/**
 * Get the OpenAI client and model configuration.
 * Throws an error if the OpenAI API key is not set in the settings.
 */
async function getOpenAIModel() {
  const config = await getConfig();
  if (!config.openaiKey) {
    throw new Error('OpenAI API key is not set');
  }

  const openai = createOpenAI({
    compatibility: 'strict', // strict mode, enabled when using the OpenAI API
    apiKey: config.openaiKey,
  });

  return openai(OPENAI_MODEL);
}

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
  const model = await getOpenAIModel();
  const result = await generateText({
    model: model,
    system: makeGenerateSrcbookSystemPrompt(),
    prompt: query,
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a srcbook, but finish_reason was not "stop":', result.finishReason);
  }
  return result;
}

type GenerateCellResult = {
  error: boolean;
  errors?: string[];
  cell?: CellType;
};
export async function generateCell(
  query: string,
  session: SessionType,
  insertIdx: number,
): Promise<GenerateCellResult> {
  const model = await getOpenAIModel();

  const systemPrompt = makeGenerateCellSystemPrompt(session.metadata.language);
  const userPrompt = makeGenerateCellUserPrompt(session, insertIdx, query);
  const result = await generateText({
    model: model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a cell, but finish_reason was not "stop":', result.finishReason);
  }

  // Parse the result into cells
  const text = result.text;

  // TODO figure out logging here. It's incredibly valuable to see the data going to and from the LLM
  // for debugging, but there are considerations around privacy and log size to think about.
  const decodeResult = decodePartial(text);

  if (decodeResult.error) {
    return { error: true, errors: decodeResult.errors };
  } else {
    const cells = decodeResult.cells;
    if (cells.length !== 1) {
      return { error: true, errors: ['Multiple cells generated. Expected only one.'] };
    } else {
      return { error: false, cell: decodeResult.cells[0] };
    }
  }
}
