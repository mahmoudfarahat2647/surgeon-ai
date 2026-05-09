import React from "react";
import { Box, Text } from "ink";

export function KeyHints(): React.ReactElement {
  return (
    <Box borderStyle="single" borderTop={true} paddingX={1}>
      <Text dimColor>
        {"[↑/↓] Navigate  [Space] Select  [Enter] Execute  [q] Quit  [a] All  [n] None"}
      </Text>
    </Box>
  );
}
