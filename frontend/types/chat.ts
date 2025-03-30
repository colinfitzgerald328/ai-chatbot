export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface ChatRequest {
  messages: {
    role: string;
    content: string;
  }[];
  system_prompt?: string;
} 