import React, { memo } from 'react';
import { Select, Box } from '@chakra-ui/react';

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
  return (
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
      _hover={{ borderColor: 'purple.300' }}
      _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' }}
    >
      <option value="claude" style={{color: 'black'}}>Claude</option>
      <option value="gpt" style={{color: 'black'}}>GPT-4o</option>
      <option value="gemini" style={{color: 'black'}}>Gemini</option>
    </Select>
  );
});

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
