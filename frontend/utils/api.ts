import { Message, StreamingTextOptions } from '../types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds timeout

export const sendMessageStream = async (
  messages: Omit<Message, 'id' | 'timestamp'>[],
  model: string,
  options: StreamingTextOptions
) => {
  const { onToken, onComplete, onError } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    onError(new Error('Request timed out'));
  }, API_TIMEOUT);

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Server error: ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        const text = decoder.decode(value);
        onToken(text);
      }
    }

    onComplete();
  } catch (error) {
    // Only call onError if the error is not an AbortError (which we handle by the timeout)
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  } finally {
    clearTimeout(timeoutId);
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_URL}/api/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
