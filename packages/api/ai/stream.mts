import { StreamData, streamText } from 'ai';
import { type Response } from 'express';
import { getModel } from './config.mjs';

/**
 * Note things added with data.append will be 2: in stream, LLM res is 0: so you can
 * add any data you need to pass to the client as this goes to trigger UI events or
 * other actions.
 */
export async function streamResponse(res: Response): Promise<Response> {
  const data = new StreamData();
  data.append('initialized call');

  const prompt = 'tell me a story about spaghetti';

  const result = await streamText({
    model: await getModel(),
    prompt: prompt,
    onFinish({ text, usage, finishReason }) {
      console.log('call usage:', usage);
      console.log('streamed text:', text);
      console.log('finish reason:', finishReason);

      data.append('call completed');
      data.close();
    },
  });

  result.pipeDataStreamToResponse(res, { data });
  return res;
}
