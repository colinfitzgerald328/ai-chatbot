import React from "react";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useColorModeValue,
  Text,
  Flex,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";

export type ModelType = "Claude 3-7 Sonnet" | "GPT 4o" | "Gemini 2.5 Pro";

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
}) => {
  const menuBg = useColorModeValue("white", "gray.800");
  const menuBorder = useColorModeValue("gray.200", "gray.700");

  const getModelLabel = (model: ModelType): string => {
    switch (model) {
      case "Claude 3-7 Sonnet":
        return "Claude 3-7 Sonnet";
      case "GPT 4o":
        return "GPT 4o";
      case "Gemini 2.5 Pro":
        return "Gemini 2.5 Pro";
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
        <MenuItem onClick={() => onModelChange("Claude 3-7 Sonnet")}>
          Claude 3-7 Sonnet
        </MenuItem>
        <MenuItem onClick={() => onModelChange("GPT 4o")}>GPT 4o</MenuItem>
        <MenuItem onClick={() => onModelChange("Gemini 2.5 Pro")}>
          Gemini 2.5 Pro
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

export default ModelSelector;
