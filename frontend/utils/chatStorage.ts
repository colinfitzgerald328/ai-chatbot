import { Message } from "../types/chat";

// Save chat history to localStorage
export const saveChatHistory = (messages: Message[]): void => {
  try {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
};

// Load chat history from localStorage
export const loadChatHistory = (): Message[] => {
  try {
    const history = localStorage.getItem("chatHistory");
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
  }
};

// Clear chat history from localStorage
export const clearChatHistory = (): void => {
  try {
    localStorage.removeItem("chatHistory");
  } catch (error) {
    console.error("Failed to clear chat history:", error);
  }
};
