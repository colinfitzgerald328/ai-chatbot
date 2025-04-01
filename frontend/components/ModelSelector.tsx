import React, { memo } from 'react';
import { Select, Box, Flex, Text, Badge, Image } from '@chakra-ui/react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = memo(({ 
  selectedModel, 
  onModelChange, 
  disabled = false 
}) => {
  // Get current model info
  const getModelInfo = (model: string) => {
    switch(model) {
      case 'claude':
        return { name: 'Claude', icon: '🧠', color: 'blue' };
      case 'gpt':
        return { name: 'GPT-4o', icon: '🤖', color: 'green' };
      case 'gemini':
        return { name: 'Gemini', icon: '✨', color: 'blue' };
      default:
        return { name: 'AI', icon: '🧠', color: 'gray' };
    }
  };

  const currentModel = getModelInfo(selectedModel);
  
  return (
    <Flex align="center">
      <Box
        as="span"
        mr={2}
        fontSize="sm"
        display={{ base: 'none', sm: 'inline-block' }}
      >
        {currentModel.icon}
      </Box>
      <Select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        size="sm"
        bg="white"
        color="gray.700"
        fontWeight="medium"
        borderColor="gray.300"
        width="auto"
        minWidth="120px"
        borderRadius="md"
        _hover={{ borderColor: 'blue.300' }}
        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
        sx={{
          '& option': {
            background: 'white',
            color: 'black',
            padding: '10px',
            fontSize: '14px',
          }
        }}
        className="model-selector"
        transition="all 0.2s ease"
        cursor="pointer"
        iconSize="18px"
        isDisabled={disabled}
      >
        <option value="claude" style={{color: 'black'}}>{currentModel.icon === "🧠" ? "" : "🧠 "}Claude</option>
        <option value="gpt" style={{color: 'black'}}>{currentModel.icon === "🤖" ? "" : "🤖 "}GPT-4o</option>
        <option value="gemini" style={{color: 'black'}}>{currentModel.icon === "✨" ? "" : "✨ "}Gemini</option>
      </Select>

      <Badge 
        ml={2} 
        colorScheme={currentModel.color} 
        fontSize="xs" 
        fontWeight="medium" 
        borderRadius="full"
        px={2}
        py={0.5}
        textTransform="none"
        opacity={0.8}
        display={{ base: 'none', md: 'block' }}
      >
        {currentModel.name}
      </Badge>
    </Flex>
  );
});

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
