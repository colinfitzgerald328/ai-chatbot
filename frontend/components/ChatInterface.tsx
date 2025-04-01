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
  Tooltip
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
    const checkServerHealth = async () => {
      const isHealthy = await checkHealth();
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
    };
    
    checkServerHealth();
  }, [toast]);
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Send a message
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
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, assistantMessage],
      isLoading: true,
      error: null,
    }));

    // Format messages for API
    const messagesToSend = state.messages
      .concat(userMessage)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    try {
      await sendMessageStream(
        messagesToSend,
        state.selectedModel,
        {
          onToken: (token: string) => {
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
            setState(prev => ({ ...prev, isLoading: false }));
            setStreamComplete(true);
            setStreamingMessageId(null);
          },
          onError: (error: Error) => {
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
        }
      );
    } catch (error) {
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

  // Memoize the chat messages to reduce re-renders
  const chatMessages = useMemo(() => {
    return state.messages.map(message => (
      <ChatMessage
        key={message.id}
        message={message}
        isStreaming={streamingMessageId === message.id}
        streamComplete={streamComplete}
      />
    ));
  }, [state.messages, streamingMessageId, streamComplete]);

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

  return (
    <Card
      bg="white"
      boxShadow="xl"
      borderRadius="xl"
      height="calc(100vh - 4rem)"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      <CardHeader
        bg="purple.50"
        borderBottom="1px solid"
        borderColor="gray.200"
        px={6}
        py={4}
      >
        <Flex 
          justify="space-between" 
          align="center"
          wrap={{ base: 'wrap', md: 'nowrap' }}
          gap={{ base: 2, md: 0 }}
        >
          {/* Left side: Title */}
          <Heading size="md" fontWeight="semibold" color="purple.600" mr={2}>AI Chat Assistant</Heading>
          
          {/* Right side: Controls */}
          <Flex 
            align="center" 
            gap={4}
            ml={{ base: 0, md: 'auto' }}
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
              colorScheme="gray"
              onClick={clearChat}
              isDisabled={state.isLoading || state.messages.length === 0}
              flexShrink={0}
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
          p={4}
          minH="300px"
        >
          {state.messages.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              flex={1}
              minH="300px"
              p={6}
              textAlign="center"
              color="gray.700"
              bg="white"
              borderRadius="lg"
              border="1px dashed"
              borderColor="purple.200"
              m={4}
              boxShadow="sm"
            >
              <Box mb={6} fontSize="4xl">
                💬
              </Box>
              <Heading size="md" mb={3} color="purple.600">Welcome to AI Chat Assistant</Heading>
              <Text fontSize="md" mb={4}>Start a conversation by typing a message below.</Text>
              
              <Box mt={4} p={4} bg="purple.50" borderRadius="md" width="100%" maxW="md">
                <Heading size="xs" mb={3} color="purple.700">Suggested prompts:</Heading>
                <Flex direction="column" gap={2}>
                  {[
                    "Write a short story about a space explorer",
                    "Explain quantum computing to a 10-year old",
                    "What are some healthy breakfast recipes?"
                  ].map((prompt, i) => (
                    <Button 
                      key={i} 
                      size="sm" 
                      colorScheme="purple" 
                      variant="ghost"
                      justifyContent="flex-start"
                      fontWeight="normal"
                      textAlign="left"
                      height="auto"
                      py={2}
                      px={3}
                      onClick={() => {
                        setInput(prompt);
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </Flex>
              </Box>
            </Flex>
          ) : (
            <Box px={2} py={4}>
              <Text fontSize="xs" color="gray.500" mb={3} ml={1}>
                Powered by {modelInfo.name} ({modelInfo.icon})
              </Text>
              {chatMessages}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </VStack>
      </CardBody>

      <CardFooter
        p={4}
        borderTop="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <VStack w="100%" spacing={3}>
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
              borderRightRadius={0}
              py={6}
              pl={4}
              pr={12}
            />
            <IconButton
              aria-label="Send message"
              icon={<ArrowUpIcon />}
              onClick={sendMessage}
              isLoading={state.isLoading}
              isDisabled={!input.trim() || !serverHealthy}
              colorScheme="purple"
              borderLeftRadius={0}
              position="absolute"
              right={0}
              top={0}
              height="100%"
              width="48px"
              zIndex={2}
              opacity={input.trim() ? 1 : 0.7}
              _hover={{ opacity: 1 }}
            />
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
