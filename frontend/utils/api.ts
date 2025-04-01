import { Message, StreamingTextOptions } from '../types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 2; // Maximum number of retries for failed requests

// Simple in-memory cache for responses
interface CacheItem {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheItem>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if a response is in the cache and still valid
const getFromCache = (key: string) => {
  if (cache.has(key)) {
    const item = cache.get(key)!;
    if (Date.now() - item.timestamp < CACHE_TTL) {
      return item.data;
    }
    // Remove expired item
    cache.delete(key);
  }
  return null;
};

// Save response to cache
const saveToCache = (key: string, data: any) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

// Enhanced fetch with timeout, retry and abort support
const enhancedFetch = async (
  url: string,
  options: RequestInit & { timeout?: number; retries?: number },
  externalSignal?: AbortSignal
) => {
  const { timeout = API_TIMEOUT, retries = MAX_RETRIES, ...fetchOptions } = options;
  
  // Create a controller for this specific request
  const controller = new AbortController();
  
  // If an external signal is provided, listen for abort events
  if (externalSignal) {
    if (externalSignal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    
    externalSignal.addEventListener('abort', () => {
      controller.abort();
    });
  }
  
  // Combine with any existing signal
  const signal = controller.signal;
  
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out'));
    }, timeout);
    
    // Clean up timeout if signal is aborted externally
    signal.addEventListener('abort', () => clearTimeout(id));
  });
  
  // Create fetch promise with retry logic
  const fetchWithRetry = async (retriesLeft: number): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal,
      });
      
      if (!response.ok && retriesLeft > 0 && response.status >= 500) {
        // Only retry server errors (5xx)
        return fetchWithRetry(retriesLeft - 1);
      }
      
      return response;
    } catch (error) {
      if (
        error instanceof Error && 
        error.name === 'AbortError' && 
        !signal.aborted && // If signal wasn't aborted by us (timeout)
        retriesLeft > 0
      ) {
        return fetchWithRetry(retriesLeft - 1);
      }
      throw error;
    }
  };
  
  // Race between timeout and fetch with retry
  return Promise.race([
    timeoutPromise,
    fetchWithRetry(retries),
  ]);
};

export const sendMessageStream = async (
  messages: Omit<Message, 'id' | 'timestamp'>[],
  model: string,
  options: StreamingTextOptions,
  signal?: AbortSignal
) => {
  const { onToken, onComplete, onError } = options;
  
  try {
    const response = await enhancedFetch(
      `${API_URL}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
        }),
        timeout: API_TIMEOUT,
        retries: MAX_RETRIES, 
      },
      signal
    );

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Use TransformStream for more efficient streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    // Process stream with requestAnimationFrame for smoother UI updates
    const processStreamChunk = async () => {
      if (done) return;
      
      try {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          buffer += decoder.decode(value, { stream: !doneReading });
          // Process buffer
          if (buffer) {
            onToken(buffer);
            buffer = '';
          }
        }

        if (!done) {
          // Schedule next chunk processing
          requestAnimationFrame(processStreamChunk);
        } else {
          onComplete();
        }
      } catch (error) {
        done = true;
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    // Start processing
    processStreamChunk();
  } catch (error) {
    // Only call onError if the error is not an AbortError from external signal
    if (
      !(error instanceof DOMException && 
      error.name === 'AbortError' && 
      signal?.aborted)
    ) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    // Check if we have a cached result
    const cacheKey = `health_check`;
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    const response = await enhancedFetch(
      `${API_URL}/api/health`,
      {
        timeout: 5000,
        retries: 1,
      }
    );
    
    const result = response.ok;
    // Cache the result for a short time
    saveToCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
