export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  selectedModel: string;
}

export type StreamingTextOptions = {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
};
