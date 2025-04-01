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
    >
      <Avatar 
        size="sm" 
        name={isUser ? 'You' : 'AI Assistant'}
        bg={isUser ? 'blue.500' : 'purple.500'}
        color="white"
        fontWeight="bold"
      />
      
      <Box 
        maxW="90%" 
        py={3} 
        px={4} 
        borderRadius="lg" 
        bg={isUser ? 'blue.50' : 'white'}
        borderWidth={!isUser ? 1 : 0}
        borderColor="gray.200"
        boxShadow={!isUser ? 'sm' : 'none'}
      >
        <Flex direction="column" gap={1}>
          <Text fontWeight="semibold" fontSize="sm" color={isUser ? 'blue.600' : 'purple.600'} mb={1}>
            {isUser ? 'You' : 'AI Assistant'}
          </Text>
          
          {isUser ? (
            <Text whiteSpace="pre-wrap" color="gray.800" fontSize="md">{message.content}</Text>
          ) : (
            <StreamingText 
              text={message.content} 
              complete={!isStreaming || streamComplete}
              speed={5}
            />
          )}
        </Flex>
      </Box>
    </Flex>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
