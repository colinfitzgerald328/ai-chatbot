import React from 'react';
import { 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem, 
  Button, 
  useColorModeValue,
  Icon,
  Text,
  Flex
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';

export type ModelType = 'claude' | 'gpt' | 'gemini';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.700');
  
  const getModelLabel = (model: ModelType): string => {
    switch (model) {
      case 'claude': return 'Claude';
      case 'gpt': return 'GPT';
      case 'gemini': return 'Gemini';
    }
  };

  return (
    <Menu>
      <MenuButton 
        as={Button} 
        rightIcon={<ChevronDownIcon />} 
        size="sm" 
        variant="outline"
        borderColor={useColorModeValue("gray.300", "gray.600")}
        _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
      >
        <Flex alignItems="center">
          <Text>{getModelLabel(selectedModel)}</Text>
        </Flex>
      </MenuButton>
      <MenuList 
        zIndex={1500} 
        bg={menuBg} 
        borderColor={menuBorder}
        boxShadow="md"
      >
        <MenuItem onClick={() => onModelChange('claude')}>Claude</MenuItem>
        <MenuItem onClick={() => onModelChange('gpt')}>GPT</MenuItem>
        <MenuItem onClick={() => onModelChange('gemini')}>Gemini</MenuItem>
      </MenuList>
    </Menu>
  );
};

export default ModelSelector; 