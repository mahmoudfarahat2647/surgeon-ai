import React from "react";
import { Box, Text } from "ink";
import type { FileDiff } from "../../types/finding.js";

interface DiffViewProps {
  diff: FileDiff;
}

export function DiffView({ diff }: DiffViewProps): React.ReactElement {
  const oldLines = diff.oldCode.split("\n");
  const newLines = diff.newCode.split("\n");

  const hunkHeader = `@@ -${diff.startLine},${oldLines.length} +${diff.startLine},${newLines.length} @@`;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold>{"--- "}</Text>
        <Text bold>{diff.file}</Text>
      </Box>
      <Box>
        <Text bold>{"--- a/"}</Text>
        <Text>{diff.file}</Text>
      </Box>
      <Box>
        <Text bold>{"  b/"}</Text>
        <Text>{diff.file}</Text>
      </Box>
      <Box>
        <Text color="cyan">{hunkHeader}</Text>
      </Box>
      {oldLines.map((line, i) => (
        <Box key={`old-${i}`}>
          <Text color="red">{`-${line}`}</Text>
        </Box>
      ))}
      {newLines.map((line, i) => (
        <Box key={`new-${i}`}>
          <Text color="green">{`+${line}`}</Text>
        </Box>
      ))}
    </Box>
  );
}
