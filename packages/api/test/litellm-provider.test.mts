import { describe, it, expect } from 'vitest';
import { AiProvider, defaultModels, isValidProvider, getDefaultModel } from '../../shared/src/ai.mjs';

describe('LiteLLM provider registration', () => {
  it('should include litellm in AiProvider enum', () => {
    expect(AiProvider.LiteLLM).toBe('litellm');
  });

  it('should have a default model for litellm', () => {
    expect(defaultModels[AiProvider.LiteLLM]).toBeDefined();
    expect(defaultModels[AiProvider.LiteLLM]).toBe('gpt-4o-mini');
  });

  it('should validate litellm as a valid provider', () => {
    expect(isValidProvider('litellm')).toBe(true);
  });

  it('should return default model for litellm', () => {
    expect(getDefaultModel('litellm')).toBe('gpt-4o-mini');
  });

  it('should not break existing providers', () => {
    expect(isValidProvider('openai')).toBe(true);
    expect(isValidProvider('anthropic')).toBe(true);
    expect(isValidProvider('custom')).toBe(true);
    expect(isValidProvider('openrouter')).toBe(true);
  });

  it('should reject invalid providers', () => {
    expect(isValidProvider('nonexistent')).toBe(false);
  });
});
