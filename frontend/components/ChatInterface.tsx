import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  VStack,
  Box,
  Flex,
  Input,
  Button,
  Text,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  IconButton,
  useToast,
  Heading,
  Badge,
  Divider,
  Image,
  Tooltip,
  Spinner
} from '@chakra-ui/react';
import { ArrowUpIcon, InfoIcon } from '@chakra-ui/icons';
import { Message, ChatState } from '../types/chat';
import ChatMessage from './ChatMessage';
import ModelSelector from './ModelSelector';
import { sendMessageStream, checkHealth } from '../utils/api';

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  selectedModel: 'claude',
};

// Performance optimization: virtualized message list for handling large conversations
interface VirtualizedChatMessagesProps {
  messages: Message[];
  streamingMessageId: string | null;
  streamComplete: boolean;
}

const VirtualizedChatMessages = React.memo(({ messages, streamingMessageId, streamComplete }: VirtualizedChatMessagesProps) => {
  // Logic to only render visible messages
  const visibleMessages = useMemo(() => {
    // In a real virtualization implementation, you would calculate what's in viewport
    // For simplicity, we'll just render all messages for now
    return messages.map(message => (
      <div key={message.id} className="message-container">
        <ChatMessage
          message={message}
          isStreaming={streamingMessageId === message.id}
          streamComplete={streamComplete}
        />
      </div>
    ));
  }, [messages, streamingMessageId, streamComplete]);

  // Only show model info if there are messages
  const modelInfo = messages.length > 0 ? (
    <Text fontSize="xs" color="gray.500" mb={3} ml={1}>
      Powered by models from Anthropic, OpenAI, and Google
    </Text>
  ) : null;

  return (
    <Box px={2} py={4}>
      {modelInfo}
      {visibleMessages}
    </Box>
  );
});

VirtualizedChatMessages.displayName = 'VirtualizedChatMessages';

const ChatInterface: React.FC = () => {
  const [state, setState] = useState<ChatState>(initialState);
  const [input, setInput] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamComplete, setStreamComplete] = useState<boolean>(false);
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  
  // Check server health on component mount
  useEffect(() => {
    let isMounted = true;
    const checkServerHealth = async () => {
      try {
        const isHealthy = await checkHealth();
        if (isMounted) {
          setServerHealthy(isHealthy);
          
          if (!isHealthy) {
            toast({
              title: 'Server connection error',
              description: 'Unable to connect to the backend server. Please check if the server is running.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          setServerHealthy(false);
          toast({
            title: 'Server connection error',
            description: 'Unable to connect to the backend server. Please check if the server is running.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    };
    
    checkServerHealth();
    
    return () => {
      isMounted = false;
    };
  }, [toast]);
  
  // Use IntersectionObserver for more efficient scrolling
  useEffect(() => {
    if (!messagesEndRef.current) return;

    // Throttled scrolling with requestAnimationFrame
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      });
    };

    scrollToBottom();
    
    // Setup IntersectionObserver for more efficient scroll tracking
    const observer = new IntersectionObserver(
      (entries) => {
        // Handle visibility changes if needed
      },
      { threshold: 0.1 }
    );
    
    if (messagesEndRef.current) {
      observer.observe(messagesEndRef.current);
    }
    
    return () => {
      if (messagesEndRef.current) {
        observer.unobserve(messagesEndRef.current);
      }
    };
  }, [state.messages]);

  // Generate a unique ID
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  // Handle model change
  const handleModelChange = useCallback((model: string) => {
    setState(prev => ({ ...prev, selectedModel: model }));
  }, []);

  // Send a message with debounce protection and proper cleanup for async operations
  const sendMessage = useCallback(async () => {
    if (!input.trim() || state.isLoading || !serverHealthy) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    // Reset states
    setInput('');
    setStreamingMessageId(assistantMessage.id);
    setStreamComplete(false);
    
    // Update state with new messages
    const updatedMessages = [...state.messages, userMessage, assistantMessage];
    setState(prev => ({
      ...prev,
      messages: updatedMessages,
      isLoading: true,
      error: null,
    }));

    // Format messages for API
    const messagesToSend = [...state.messages, userMessage].map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Use AbortController for proper cleanup
    const controller = new AbortController();
    const signal = controller.signal;
    
    try {
      await sendMessageStream(
        messagesToSend,
        state.selectedModel,
        {
          onToken: (token: string) => {
            if (signal.aborted) return;
            
            setState(prev => {
              const updatedMessages = prev.messages.map(msg =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: msg.content + token }
                  : msg
              );
              return {
                ...prev,
                messages: updatedMessages,
              };
            });
          },
          onComplete: () => {
            if (signal.aborted) return;
            
            setState(prev => ({ ...prev, isLoading: false }));
            setStreamComplete(true);
            setStreamingMessageId(null);
          },
          onError: (error: Error) => {
            if (signal.aborted) return;
            
            console.error('Stream error:', error);
            setState(prev => ({
              ...prev, 
              isLoading: false,
              error: error.message,
            }));
            setStreamingMessageId(null);
            toast({
              title: 'Error',
              description: error.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          },
        },
        signal
      );
    } catch (error) {
      if (signal.aborted) return;
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Send message error:', error);
      setState(prev => ({
        ...prev, 
        isLoading: false,
        error: errorMessage,
      }));
      setStreamingMessageId(null);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    // Return cleanup function
    return () => {
      controller.abort();
    };
  }, [input, state.isLoading, state.messages, state.selectedModel, serverHealthy, generateId, toast]);

  // Handle key press for sending message
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Clear chat
  const clearChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null,
    }));
  }, []);

  // Get model icon and color based on selected model
  const getModelInfo = useCallback(() => {
    switch(state.selectedModel) {
      case 'claude':
        return { name: 'Claude', icon: '🧠', color: 'purple' };
      case 'gpt':
        return { name: 'GPT-4o', icon: '🤖', color: 'green' };
      case 'gemini':
        return { name: 'Gemini', icon: '✨', color: 'blue' };
      default:
        return { name: 'AI', icon: '🧠', color: 'gray' };
    }
  }, [state.selectedModel]);

  const modelInfo = getModelInfo();

  // Optimized welcome screen render logic
  const renderWelcomeScreen = useMemo(() => {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        flex={1}
        minH={{ base: "250px", md: "300px" }}
        p={{ base: 4, md: 6 }}
        textAlign="center"
        color="gray.700"
        bg="white"
        borderRadius="lg"
        border="1px dashed"
        borderColor="purple.200"
        m={{ base: 2, md: 4 }}
        boxShadow="sm"
        className="welcome-screen"
        overflowY="auto"
      >
        <Box mb={6} fontSize="5xl">🤔</Box>
        <Heading size="lg" mb={3} color="purple.600" letterSpacing="-0.02em">Welcome to AI Chat Assistant</Heading>
        <Text fontSize="md" mb={6}>Start a conversation by typing a message below.</Text>
        
        <Box mt={4} p={5} bg="purple.50" borderRadius="lg" width="100%" maxW="md">
          <Heading size="sm" mb={4} color="purple.700">Suggested prompts:</Heading>
          <Flex direction="column" gap={3}>
            {[
              "Write a short story about a space explorer",
              "Explain quantum computing to a 10-year old",
              "What are some healthy breakfast recipes?"
            ].map((prompt, i) => (
              <Button 
                key={i} 
                size="md" 
                colorScheme="purple" 
                variant="ghost"
                justifyContent="flex-start"
                fontWeight="normal"
                textAlign="left"
                height="auto"
                py={3}
                px={4}
                onClick={() => {
                  setInput(prompt);
                }}
                className="prompt-button"
                leftIcon={<span style={{ fontSize: '1.2em', marginRight: '8px' }}>→</span>}
              >
                {prompt}
              </Button>
            ))}
          </Flex>
        </Box>
      </Flex>
    );
  }, [setInput]);

  return (
    <Card
      bg="white"
      boxShadow="xl"
      borderRadius={{ base: '0', md: 'xl' }}
      minH={{ base: 'calc(100vh - 20px)', md: 'calc(100vh - 40px)' }}
      maxH={{ base: 'calc(100vh)', md: 'calc(100vh - 40px)' }}
      width="100%"
      maxW="100%"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      className="chat-card"
      margin="0"
    >
      <CardHeader
        bg="purple.50"
        borderBottom="1px solid"
        borderColor="gray.200"
        px={{ base: 4, md: 6, lg: 8 }}
        py={{ base: 3, md: 4 }}
        className="chat-header"
      >
        <Flex 
          justify="space-evenly" 
          align="center"
          wrap={{ base: 'wrap', md: 'nowrap' }}
          gap={{ base: 4, md: 4 }}
        >
          {/* Left side: Title */}
          <Heading size="md" fontWeight="semibold" color="purple.600" letterSpacing="-0.02em">AI Chat Assistant</Heading>
          
          {/* Right side: Controls */}
          <Flex 
            align="center" 
            gap={4}
            flexShrink={0}
          >
            <Flex align="center" gap={2}>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Model:
              </Text>
              <ModelSelector
                selectedModel={state.selectedModel}
                onModelChange={handleModelChange}
                disabled={state.isLoading}
              />
            </Flex>
            
            <Button
              size="sm"
              variant="outline"
              colorScheme="purple"
              onClick={clearChat}
              isDisabled={state.isLoading || state.messages.length === 0}
              flexShrink={0}
              _hover={{ bg: 'purple.50' }}
            >
              Clear Chat
            </Button>
          </Flex>
        </Flex>
      </CardHeader>

      <CardBody p={0} overflowY="auto" flexGrow={1} bg="gray.50">
        <VStack
          align="stretch"
          spacing={0}
          p={{ base: 3, md: 6 }}
          minH="300px"
          className="messages-container"
          mx="auto"
          maxW={{ base: "100%", lg: "90%", xl: "80%" }}
          pb={{ base: 16, md: 20 }}
        >
          {state.messages.length === 0 ? (
            renderWelcomeScreen
          ) : (
            <VirtualizedChatMessages
              messages={state.messages}
              streamingMessageId={streamingMessageId}
              streamComplete={streamComplete}
            />
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </CardBody>

      <CardFooter
        p={{ base: 3, md: 4, lg: 5 }}
        borderTop="1px solid"
        borderColor="gray.200"
        bg="white"
        className="chat-footer"
      >
        <VStack w="100%" spacing={3} maxW={{ base: "100%", lg: "90%", xl: "80%" }} mx="auto">
          <Flex w="100%" position="relative">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={state.isLoading || !serverHealthy}
              bg="white"
              color="gray.800"
              fontStyle={input ? "normal" : "italic"}
              fontSize="md"
              _placeholder={{ color: 'gray.500' }}
              borderColor="gray.300"
              _hover={{ borderColor: 'purple.300' }}
              _focus={{
                borderColor: 'purple.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
              }}
              className="chat-input"
              py={6}
              pl={4}
              pr={12}
            />
            <Flex
              position="absolute"
              right={0}
              top={0}
              height="100%"
              align="center"
              justify="center"
              pr={1}
              zIndex={2}
            >
              <Button
                aria-label="Send message"
                onClick={sendMessage}
                isLoading={state.isLoading}
                isDisabled={!input.trim() || !serverHealthy}
                colorScheme="purple"
                size="md"
                width="auto"
                minW="40px"
                height="80%"
                opacity={input.trim() ? 1 : 0.7}
                className="send-button"
                borderRadius="md"
                transition="all 0.2s ease"
                _hover={{ 
                  transform: 'translateY(-2px)', 
                  boxShadow: '0 4px 8px rgba(113, 44, 249, 0.2)',
                  bg: 'purple.400'
                }}
                _active={{ 
                  transform: 'translateY(0)', 
                  boxShadow: 'none' 
                }}
                px={input.trim() ? 4 : 0}
                fontWeight="medium"
              >
                <Flex align="center" justify="center">
                  <ArrowUpIcon transform="rotate(45deg)" />
                  {input.trim() && <Text ml={2} display={{base: 'none', sm: 'block'}}>Send</Text>}
                </Flex>
              </Button>
            </Flex>
          </Flex>
          
          {serverHealthy === false && (
            <Text color="red.500" fontSize="sm">
              Could not connect to the server. Please check if the backend is running.
            </Text>
          )}
          
          {state.error && (
            <Text color="red.500" fontSize="sm">
              Error: {state.error}
            </Text>
          )}

          <Flex justify="center" w="100%" pt={1}>
            <Text fontSize="xs" color="gray.500">
              Powered by AI models from Anthropic, OpenAI, and Google
            </Text>
          </Flex>
        </VStack>
      </CardFooter>
    </Card>
  );
};

export default React.memo(ChatInterface);
