import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Input,
  Button,
  VStack,
  Container,
  Heading,
  Text,
  useColorMode,
  IconButton,
  useToast,
  Tooltip,
  useBreakpointValue,
  InputGroup,
  InputRightElement,
  Kbd,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
  useColorModeValue,
} from '@chakra-ui/react';
import { SunIcon, MoonIcon, DeleteIcon, ArrowUpIcon, SettingsIcon } from '@chakra-ui/icons';
import ChatMessage from './ChatMessage';
import { Message } from '../types/chat';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '../utils/chatStorage';
import ModelSelector, { ModelType } from './ModelSelector';

// API endpoint configuration
const API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL;


// Debounce function to limit updates
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();
  
  // Ref to store the current response text during streaming
  const currentResponseRef = useRef('');
  
  // Ref to track if we should auto-scroll
  const shouldScrollRef = useRef(true);
  
  // Ref to track the previous scroll height
  const prevScrollHeightRef = useRef(0);
  
  // Responsive adjustments
  const containerMaxW = useBreakpointValue({ base: '100%', md: 'container.md', lg: 'container.lg' });
  const headingSize = useBreakpointValue({ base: 'lg', md: 'xl' });

  // Add this to the state declarations (around line 46-50)
  const [selectedModel, setSelectedModel] = useState<ModelType>('claude');

  // Create a debounced update function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateMessage = useCallback(
    debounce((content: string) => {
      // Store the current scroll position and height before updating
      const container = chatContainerRef.current;
      if (container) {
        prevScrollHeightRef.current = container.scrollHeight;
      }
      
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = content;
        return updated;
      });
      
      // We'll handle scrolling in the useEffect that watches for DOM updates
    }, 30), // Update more frequently (30ms) for smoother streaming
    []
  );

  // Improved scroll to bottom function with smooth option
  const scrollToBottom = useCallback((smooth = true) => {
    if (!chatContainerRef.current) return;
    
    const container = chatContainerRef.current;
    
    // Use requestAnimationFrame to ensure DOM updates are complete
    requestAnimationFrame(() => {
      // Direct scrollTop approach is most reliable
      container.scrollTop = container.scrollHeight;
      
      // Also try scrollIntoView as a backup
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'end',
        });
      }
    });
  }, []);
  
  // Force scroll to bottom regardless of user scroll position
  const forceScrollToBottom = useCallback(() => {
    shouldScrollRef.current = true;
    scrollToBottom(false);
  }, [scrollToBottom]);
  
  // Scroll to maintain position during streaming
  const scrollToMaintainPosition = useCallback(() => {
    if (!chatContainerRef.current || !isStreaming || !shouldScrollRef.current) return;
    
    const container = chatContainerRef.current;
    const newScrollHeight = container.scrollHeight;
    const heightDifference = newScrollHeight - prevScrollHeightRef.current;
    
    if (heightDifference > 0) {
      // If we're near the bottom or actively streaming, scroll to keep the latest content visible
      const { scrollTop, clientHeight } = container;
      const distanceFromBottom = newScrollHeight - scrollTop - clientHeight;
      
      // If we're within 150px of the bottom, scroll to keep the latest content visible
      if (distanceFromBottom < 150) {
        container.scrollTop = newScrollHeight - clientHeight;
      }
    }
    
    // Update the previous scroll height
    prevScrollHeightRef.current = newScrollHeight;
  }, [isStreaming]);

  // Load chat history on component mount
  useEffect(() => {
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
      
      // Initial scroll to bottom after loading history
      setTimeout(() => {
        forceScrollToBottom();
      }, 100);
    }
  }, [forceScrollToBottom]);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (shouldScrollRef.current && !isStreaming) {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    } else if (isStreaming) {
      // During streaming, maintain scroll position to follow the text
      scrollToMaintainPosition();
    }
  }, [messages, scrollToBottom, isStreaming, scrollToMaintainPosition]);
  
  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add scroll event listener to detect when user scrolls up
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // If we're close to the bottom, enable auto-scrolling
      if (distanceFromBottom < 50) {
        shouldScrollRef.current = true;
      } else if (!isStreaming) {
        // Only disable auto-scroll if we're not currently streaming
        // This allows the user to scroll up to read previous messages
        // but maintains the auto-scroll during active streaming
        shouldScrollRef.current = false;
      }
    };
    
    chatContainer.addEventListener('scroll', handleScroll);
    
    return () => {
      chatContainer.removeEventListener('scroll', handleScroll);
    };
  }, [isStreaming]);

  // Monitor resize events to handle container size changes
  useEffect(() => {
    const handleResize = () => {
      // When window resizes, check if we should scroll
      if (shouldScrollRef.current) {
        scrollToBottom(false);
      } else if (isStreaming) {
        // During streaming, maintain position
        scrollToMaintainPosition();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToBottom, isStreaming, scrollToMaintainPosition]);

  // Force scroll to bottom when a new message is added
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Always scroll to bottom for new messages or thinking state
      if (lastMessage.role === 'user' || lastMessage.isThinking) {
        forceScrollToBottom();
      }
    }
  }, [messages.length, forceScrollToBottom]);

  const handleClearChat = () => {
    setMessages([]);
    clearChatHistory();
    toast({
      title: 'Chat cleared',
      status: 'info',
      duration: 2000,
      isClosable: true,
      position: 'top',
    });
    
    // Focus the input after clearing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: Date.now()
    };
    
    // Add the user message immediately
    setMessages((prev) => [...prev, userMessage]);
    
    // Clear the input
    setInput('');
    
    // Set loading state
    setIsLoading(true);
    
    // Force scroll to bottom and enable auto-scrolling
    forceScrollToBottom();
    
    // Add a placeholder "Model is thinking..." message
    const thinkingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isThinking: true,
      modelName: selectedModel  // Add the model name to the thinking message
    };
    
    // Add the thinking message
    setMessages((prev) => [...prev, thinkingMessage]);
    
    // Force scroll to bottom again after adding thinking message
    forceScrollToBottom();

    try {
      currentResponseRef.current = '';

      // Prepare messages for the API (filter out thinking messages)
      const apiMessages = messages.filter(msg => !msg.isThinking).concat(userMessage).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel, // Include selected model in the request
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      // Get the response as a stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      // Variables for streaming
      let buffer = '';
      let firstTokenReceived = false;
      let lastUpdateTime = Date.now();
      const updateInterval = 30; // Update UI more frequently (30ms) for smoother streaming
      
      // Set streaming state to true
      setIsStreaming(true);

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // If there's any remaining content in the buffer, update the message
          if (buffer.length > 0) {
            currentResponseRef.current += buffer;
            
            // If this is the first content we've received, create the assistant message
            if (!firstTokenReceived) {
              firstTokenReceived = true;
              
              // Replace the thinking message with the actual response
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: currentResponseRef.current,
                  timestamp: Date.now()
                };
                return updated;
              });
              
              // Force scroll to bottom after adding the complete message
              forceScrollToBottom();
            } else {
              // Otherwise update the existing message
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].content = currentResponseRef.current;
                return updated;
              });
              
              // Force scroll to bottom after final update
              forceScrollToBottom();
            }
          }
          
          // End streaming state
          setIsStreaming(false);
          break;
        }
        
        // Decode the chunk and add to buffer
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;
        
        // If this is the first content we've received
        if (!firstTokenReceived && buffer.trim()) {
          firstTokenReceived = true;
          
          // Replace the thinking message with the actual response
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: buffer,
              timestamp: Date.now()
            };
            return updated;
          });
          
          currentResponseRef.current = buffer;
          buffer = '';
          lastUpdateTime = Date.now();
          
          // Force scroll to bottom after adding the first message
          forceScrollToBottom();
          continue;
        }
        
        // Update the UI periodically rather than on every chunk
        if (firstTokenReceived) {
          const now = Date.now();
          if (now - lastUpdateTime > updateInterval) {
            currentResponseRef.current += buffer;
            debouncedUpdateMessage(currentResponseRef.current);
            buffer = '';
            lastUpdateTime = now;
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to communicate with Claude',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      
      // Replace the thinking message with an error message
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.',
          timestamp: Date.now()
        };
        return updated;
      });
      
      // Force scroll to bottom after error
      forceScrollToBottom();
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      
      // Focus the input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <Container maxW={containerMaxW} py={4} px={{ base: 2, md: 4 }} height="100vh" display="flex" flexDirection="column">
      <Flex justifyContent="space-between" alignItems="center" mb={3}>
        <Heading size={headingSize} fontWeight="semibold">
          <Flex alignItems="center">
            <Text 
              color={useColorModeValue("purple.600", "purple.300")}
              display="inline"
            >
              Medical
            </Text>
            <Text ml={1} display="inline" color={useColorModeValue("gray.700", "gray.200")}>Assistant</Text>
          </Flex>
        </Heading>
        <Flex>
          <ModelSelector 
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
          <Tooltip label="Clear chat history" placement="bottom">
            <IconButton
              aria-label="Clear chat"
              icon={<DeleteIcon />}
              onClick={handleClearChat}
              mr={2}
              isDisabled={messages.length === 0}
              size={{ base: 'sm', md: 'md' }}
              variant="ghost"
              color={useColorModeValue("gray.500", "gray.400")}
            />
          </Tooltip>
          <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`} placement="bottom">
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              size={{ base: 'sm', md: 'md' }}
              variant="ghost"
              mr={2}
              color={useColorModeValue("gray.500", "gray.400")}
            />
          </Tooltip>
          <Menu>
            <Tooltip label="Settings" placement="bottom">
              <MenuButton
                as={IconButton}
                aria-label="Settings"
                icon={<SettingsIcon />}
                variant="ghost"
                size={{ base: 'sm', md: 'md' }}
                color={useColorModeValue("gray.500", "gray.400")}
              />
            </Tooltip>
            <Portal>
              <MenuList zIndex={1500}>
                <MenuItem onClick={handleClearChat}>Clear conversation</MenuItem>
                <MenuItem onClick={toggleColorMode}>
                  Switch to {colorMode === 'light' ? 'dark' : 'light'} mode
                </MenuItem>
              </MenuList>
            </Portal>
          </Menu>
        </Flex>
      </Flex>
      
      <Divider mb={3} />
      
      <Box 
        borderWidth="1px"
        borderRadius="md" 
        overflow="hidden" 
        boxShadow="sm" 
        flex="1"
        display="flex"
        flexDirection="column"
        position="relative"
        bg={useColorModeValue("white", "gray.800")}
        borderColor={useColorModeValue("gray.200", "gray.700")}
      >
        <VStack 
          ref={chatContainerRef}
          flex="1" 
          overflowY="auto" 
          p={{ base: 3, md: 4 }} 
          alignItems="stretch" 
          spacing={4}
          width="100%"
          css={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              width: '8px',
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: colorMode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
              borderRadius: '24px',
            },
            // Improve scroll performance
            '&': {
              scrollBehavior: 'smooth',
              overscrollBehavior: 'contain',
            }
          }}
        >
          {messages.length === 0 ? (
            <Flex direction="column" justify="center" align="center" h="100%" opacity={0.7}>
              <Text color="gray.500" textAlign="center" fontSize="md" mb={3}>
                Start a conversation with your Medical Assistant
              </Text>
              <Text color="gray.500" fontSize="sm" textAlign="center" maxW="md">
                Ask health questions, get information about medical conditions, or learn about wellness topics
              </Text>
            </Flex>
          ) : (
            messages.map((message, index) => (
              <Box 
                key={index}
                ref={index === messages.length - 1 ? lastMessageRef : null}
              >
                <ChatMessage 
                  message={message}
                  isLatest={index === messages.length - 1}
                />
              </Box>
            ))
          )}
          {/* This empty div is used as a scroll target - increased height for better visibility */}
          <Box ref={messagesEndRef} h="20px" minH="20px" />
        </VStack>
        
        <Flex 
          p={3} 
          borderTopWidth="1px"
          bg={useColorModeValue("gray.50", "gray.900")}
          borderColor={useColorModeValue("gray.200", "gray.700")}
        >
          <InputGroup size="md">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a health question..."
              pr="4.5rem"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading && input.trim()) {
                  handleSendMessage();
                }
              }}
              focusBorderColor="purple.400"
              aria-label="Message input"
              bg={useColorModeValue("white", "gray.800")}
              boxShadow="sm"
              borderRadius="md"
              disabled={isLoading}
            />
            <InputRightElement width="4.5rem" h="full">
              {input.trim() ? (
                <Button 
                  h="1.75rem" 
                  size="sm" 
                  colorScheme="purple"
                  onClick={handleSendMessage}
                  isLoading={isLoading}
                  aria-label="Send message"
                  borderRadius="md"
                >
                  Send
                </Button>
              ) : (
                <Kbd color="gray.500" opacity={0.6} fontSize="xs">Enter</Kbd>
              )}
            </InputRightElement>
          </InputGroup>
        </Flex>
      </Box>
      
      <Text fontSize="xs" textAlign="center" mt={2} color="gray.500">
        Powered by {selectedModel === 'claude' ? 'Claude 3-7 Sonnet' : 
                    selectedModel === 'gpt' ? 'GPT 4o' : 
                    'Gemini 2.5-Pro'} • Not a substitute for professional medical advice
      </Text>
    </Container>
  );
};

export default ChatInterface; 