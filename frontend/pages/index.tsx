import type { NextPage } from "next";
import Head from "next/head";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import ChatInterface from "../components/ChatInterface";
import theme from "../theme";

const Home: NextPage = () => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Head>
        <title>AI Chatbot with Claude</title>
        <meta name="description" content="Chat with Claude AI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <ChatInterface />
      </main>
    </ChakraProvider>
  );
};

export default Home;
