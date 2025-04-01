import React, { memo } from 'react';
import { Box, Flex, Avatar, Text } from '@chakra-ui/react';
import { Message } from '../types/chat';
import StreamingText from './StreamingText';

interface ChatMessageProps {
  message: Message;
  isStreaming: boolean;
  streamComplete: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = memo(({ 
  message, 
  isStreaming, 
  streamComplete 
}) => {
  const isUser = message.role === 'user';
  
  return (
    <Flex 
      gap={3} 
      mb={5} 
      alignItems="start"
      data-testid={`message-${message.id}`}
      className={`message-container ${isStreaming ? '' : 'new-message'}`}
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      width="100%"
      px={{ base: 1, md: 2 }}
    >
      {!isUser && (
        <Avatar 
          size="sm" 
          name="AI Assistant"
          bg="blue.500"
          color="white"
          fontWeight="bold"
          boxShadow="0 2px 6px rgba(34, 85, 237, 0.25)"
          flexShrink={0}
        />
      )}
      
      <Box 
        maxW={{ base: "80%", md: "75%" }} 
        py={3} 
        px={4} 
        className={isUser ? 'user-message' : 'ai-message'}
        color={isUser ? 'white' : 'gray.800'}
        wordBreak="break-word"
        overflowWrap="break-word"
      >
        <Flex direction="column" gap={1}>
          <Text 
            fontWeight="semibold" 
            fontSize="sm" 
            color={isUser ? 'white' : 'blue.600'} 
            mb={1}
            className="chat-message-header"
            letterSpacing="tight"
            opacity={0.9}
          >
            {isUser ? 'You' : 'AI Assistant'}
          </Text>
          
          {isUser ? (
            <Text 
              whiteSpace="pre-wrap" 
              color={isUser ? 'white' : 'gray.800'} 
              fontSize="md"
              className="chat-message-content"
              letterSpacing="normal"
              fontWeight="normal"
            >
              {message.content}
            </Text>
          ) : (
            <Box className="chat-message-content">
              <StreamingText 
                text={message.content} 
                complete={!isStreaming || streamComplete}
                speed={5}
              />
            </Box>
          )}
        </Flex>
      </Box>
      
      {isUser && (
        <Avatar 
          size="sm" 
          name="You"
          bg="blue.400"
          color="white"
          fontWeight="bold"
          boxShadow="0 2px 6px rgba(34, 85, 237, 0.25)"
          flexShrink={0}
        />
      )}
    </Flex>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
