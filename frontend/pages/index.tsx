import { Box, Container } from '@chakra-ui/react';
import Head from 'next/head';
import { ChatInterface } from '../components';

export default function Home() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Head>
        <title>AI Chatbot</title>
        <meta name="description" content="AI Chatbot with Claude" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container maxW="container.lg" py={8}>
        <ChatInterface />
      </Container>
    </Box>
  );
}
