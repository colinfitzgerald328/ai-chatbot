import React, { useEffect, useState, useRef, memo } from 'react';
import { Box, Text, ListItem, UnorderedList, OrderedList, Heading, Divider } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';

interface StreamingTextProps {
  text: string;
  complete: boolean;
  speed?: number; // Characters per frame
}

const StreamingText: React.FC<StreamingTextProps> = memo(({ 
  text, 
  complete, 
  speed = 3 
}) => {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const textRef = useRef<string>('');
  const animationRef = useRef<number>(0);
  
  useEffect(() => {
    textRef.current = text;
    
    if (complete && displayedText !== text) {
      // If stream is complete but we haven't rendered all text, show it all at once
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }
    
    if (complete) {
      setIsComplete(true);
    }
    
    const animate = () => {
      if (displayedText.length < textRef.current.length) {
        const charsToAdd = Math.min(
          speed, 
          textRef.current.length - displayedText.length
        );
        
        setDisplayedText(prevText => 
          textRef.current.substring(0, prevText.length + charsToAdd)
        );
        animationRef.current = requestAnimationFrame(animate);
      } else if (!isComplete && complete) {
        setIsComplete(true);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [text, complete, displayedText, isComplete, speed]);
  
  // Define custom components for ReactMarkdown
  const components = {
    h1: (props: any) => <Heading as="h1" size="xl" mt={6} mb={4} color="gray.800" fontWeight="bold" {...props} />,
    h2: (props: any) => <Heading as="h2" size="lg" mt={5} mb={3} color="gray.800" fontWeight="bold" {...props} />,
    h3: (props: any) => <Heading as="h3" size="md" mt={4} mb={2} color="gray.800" fontWeight="bold" {...props} />,
    h4: (props: any) => <Heading as="h4" size="sm" mt={3} mb={2} color="gray.800" fontWeight="bold" {...props} />,
    h5: (props: any) => <Heading as="h5" size="xs" mt={3} mb={1} color="gray.800" fontWeight="bold" {...props} />,
    h6: (props: any) => <Heading as="h6" size="xs" mt={3} mb={1} color="gray.700" fontWeight="semibold" {...props} />,
    p: (props: any) => <Text mb={4} color="gray.800" lineHeight="1.7" fontSize="md" {...props} />,
    ul: (props: any) => <UnorderedList pl={5} mb={4} spacing={2} {...props} />,
    ol: (props: any) => <OrderedList pl={5} mb={4} spacing={2} {...props} />,
    li: (props: any) => <ListItem color="gray.800" pb={1} {...props} />,
    hr: () => <Divider my={4} borderColor="gray.300" />,
    a: (props: any) => (
      <Box as="a" color="blue.600" textDecoration="underline" fontWeight="medium" {...props} />
    ),
    blockquote: (props: any) => (
      <Box
        as="blockquote"
        borderLeftWidth="4px"
        borderLeftColor="gray.200"
        pl={4}
        py={2}
        my={4}
        color="gray.700"
        bg="gray.50"
        borderRadius="sm"
        {...props}
      />
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <Box my={4} borderRadius="md" overflow="hidden">
          <SyntaxHighlighter
            style={atomDark}
            language={match[1]}
            PreTag="div"
            wrapLines={true}
            showLineNumbers={true}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </Box>
      ) : (
        <Box
          as="code"
          bg="gray.100"
          color="gray.800"
          px={1}
          py={0.5}
          borderRadius="sm"
          fontFamily="monospace"
          fontSize="0.875em"
          fontWeight="medium"
          {...props}
        >
          {children}
        </Box>
      );
    },
    pre: (props: any) => (
      <Box
        as="pre"
        overflowX="auto"
        bg="gray.50"
        p={4}
        borderRadius="md"
        color="gray.800"
        my={4}
        {...props}
      />
    ),
    table: (props: any) => (
      <Box
        as="table"
        width="full"
        my={4}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
        {...props}
      />
    ),
    thead: (props: any) => (
      <Box as="thead" bg="gray.50" {...props} />
    ),
    tbody: (props: any) => (
      <Box as="tbody" {...props} />
    ),
    tr: (props: any) => (
      <Box as="tr" borderBottomWidth="1px" borderColor="gray.200" {...props} />
    ),
    th: (props: any) => (
      <Box
        as="th"
        p={2}
        fontWeight="semibold"
        textAlign="left"
        color="gray.700"
        {...props}
      />
    ),
    td: (props: any) => (
      <Box
        as="td"
        p={2}
        borderRightWidth="1px"
        borderColor="gray.200"
        _last={{ borderRightWidth: 0 }}
        {...props}
      />
    ),
    strong: (props: any) => (
      <Box as="strong" fontWeight="semibold" color="gray.800" {...props} />
    ),
    em: (props: any) => (
      <Box as="em" fontStyle="italic" {...props} />
    ),
  };
  
  return (
    <Box color="gray.800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {displayedText}
      </ReactMarkdown>
      {!isComplete && <Box as="span" animation="blink 1s infinite">&#x2503;</Box>}
    </Box>
  );
});

StreamingText.displayName = 'StreamingText';

export default StreamingText;
