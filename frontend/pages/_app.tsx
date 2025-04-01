import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

// Extend the theme to include custom colors, fonts, etc
const theme = extendTheme({
  colors: {
    brand: {
      50: '#f5f0ff',
      100: '#ecdeff',
      200: '#dcbdff',
      300: '#c894ff',
      400: '#b46ef7',
      500: '#9d4eed',
      600: '#8132d2',
      700: '#6726a8',
      800: '#4d1e7f',
      900: '#351756',
    },
  },
  fonts: {
    heading: 'var(--font-inter), system-ui, sans-serif',
    body: 'var(--font-inter), system-ui, sans-serif',
  },
  styles: {
    global: {
      'html, body': {
        backgroundColor: 'gray.50',
        color: 'gray.800',
      },
      // Ensure text is visible in all contexts
      'input, select, textarea, button, option': {
        color: 'gray.800',
      },
      // Style for placeholder text
      '::placeholder': {
        color: 'gray.500 !important',
      },
    },
  },
});

// Add a custom keyframes animation for the cursor blink
const GlobalStyles = {
  styles: {
    global: {
      '@keyframes blink': {
        '0%': { opacity: 1 },
        '50%': { opacity: 0 },
        '100%': { opacity: 1 },
      },
    },
  },
};

const extendedTheme = extendTheme(theme, GlobalStyles);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={extendedTheme}>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
