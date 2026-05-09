import React from "react";
import { Box, Text } from "ink";

interface CodeBlockProps {
  code: string;
  startLine?: number;
  maxLines?: number;
}

export function CodeBlock({
  code,
  startLine = 1,
  maxLines = 20,
}: CodeBlockProps): React.ReactElement {
  const allLines = code.split("\n");
  const truncated = allLines.length > maxLines;
  const displayLines = truncated ? allLines.slice(0, maxLines) : allLines;
  const remaining = allLines.length - maxLines;

  return (
    <Box flexDirection="column" paddingX={1}>
      {displayLines.map((line, i) => {
        const lineNum = startLine + i;
        const lineNumStr = String(lineNum).padStart(4, " ");
        return (
          <Box key={i}>
            <Text dimColor>{lineNumStr} │ </Text>
            <Text>{line}</Text>
          </Box>
        );
      })}
      {truncated && (
        <Box>
          <Text dimColor>{`... ${remaining} more lines`}</Text>
        </Box>
      )}
    </Box>
  );
}
