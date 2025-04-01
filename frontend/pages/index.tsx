import { Box } from '@chakra-ui/react';
import Head from 'next/head';
import { ChatInterface } from '../components';

export default function Home() {
  return (
    <Box minH="100vh" bg="gray.50" display="flex" flexDirection="column">
      <Head>
        <title>AI Chatbot</title>
        <meta name="description" content="AI Chatbot with Claude" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box 
        flex="1" 
        width="100%" 
        minH="100vh" 
        px={{ base: 0, md: 4, lg: 6 }}
        py={{ base: 0, md: 4 }}
      >
        <ChatInterface />
      </Box>
    </Box>
  );
}
