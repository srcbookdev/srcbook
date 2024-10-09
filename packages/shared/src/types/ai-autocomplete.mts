export type CodiumCompletionItem = {
  completion: {
    completionId: string;
    text: string;
    prefix: string;
    stop: string;
    score: number;
    tokens: Array<string>;
    decoded_tokens: Array<string>;
    probabilities: Array<number>;
    adjustedProbabilities: Array<number>;
    generatedLength: string;
  };
  completionParts: Array<{
    text: string;
    offset: string;
    prefix: string;
    type:
      | 'COMPLETION_PART_TYPE_UNSPECIFIED'
      // Single-line completion parts that appear within an existing line of text.
      | 'COMPLETION_PART_TYPE_INLINE'
      // Possibly multi-line completion parts that appear below an existing line of text.
      | 'COMPLETION_PART_TYPE_BLOCK'
      // Like COMPLETION_PART_TYPE_INLINE, but overwrites the existing text.
      | 'COMPLETION_PART_TYPE_INLINE_MASK';
  }>;
  range: {
    endOffset: string;
    endPosition: { row?: string; col?: string };
    startPosition: { row?: string; col?: string };
  };
};

export type CodiumCompletionResult = {
  completionItems?: Array<CodiumCompletionItem>;
  state: {
    state:
      | 'CODEIUM_STATE_UNSPECIFIED'
      | 'CODEIUM_STATE_INACTIVE'
      | 'CODEIUM_STATE_PROCESSING'
      | 'CODEIUM_STATE_SUCCESS'
      | 'CODEIUM_STATE_WARNING'
      | 'CODEIUM_STATE_ERROR';
    status: string;
  };
};
