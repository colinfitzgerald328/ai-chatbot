import { extendTheme, ThemeConfig } from "@chakra-ui/react";

// Define consistent color tokens
const colors = {
  brand: {
    50: "#e6f0ff",
    100: "#bed1ff",
    200: "#96b2ff",
    300: "#6e93ff",
    400: "#4674ff",
    500: "#2255ed",
    600: "#1a42be",
    700: "#13318f",
    800: "#0c2160",
    900: "#061131",
  },
  claude: {
    primary: "#2255ed",
    secondary: "#4674ff",
  },
};

// Define consistent spacing, typography, and other design tokens
const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: true,
};

// Define font weights and styles
const typography = {
  fonts: {
    heading: '"Outfit", system-ui, sans-serif',
    body: '"IBM Plex Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", monospace',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacings: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
};

// Define consistent component styles
const components = {
  Button: {
    baseStyle: {
      fontWeight: "medium",
      borderRadius: "md",
    },
    variants: {
      solid: (props: any) => ({
        bg: props.colorMode === "dark" ? "blue.500" : "blue.500",
        color: "white",
        _hover: {
          bg: props.colorMode === "dark" ? "blue.600" : "blue.400",
        },
      }),
    },
  },
  Input: {
    variants: {
      outline: (props: any) => ({
        field: {
          borderRadius: "md",
          borderColor: props.colorMode === "dark" ? "gray.600" : "gray.300",
          _hover: {
            borderColor: props.colorMode === "dark" ? "gray.500" : "gray.400",
          },
          _focus: {
            borderColor: "blue.400",
            boxShadow: `0 0 0 1px ${props.colorMode === "dark" ? "blue.400" : "blue.400"}`,
          },
        },
      }),
    },
  },
  Heading: {
    baseStyle: {
      fontWeight: "semibold",
      letterSpacing: "tight",
    },
  },
  Text: {
    baseStyle: {
      letterSpacing: "normal",
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  components,
  ...typography,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
        color: props.colorMode === "dark" ? "white" : "gray.800",
        transitionProperty: "background-color",
        transitionDuration: "normal",
      },
      "*:focus": {
        boxShadow: "outline",
        outline: "none",
      },
    }),
  },
});

export default theme;
