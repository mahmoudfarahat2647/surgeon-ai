import React from "react";
import { Box, Text } from "ink";
import { useTui } from "../state.js";
import { useKeyboard } from "../hooks/useKeyboard.js";
import { CodeBlock } from "../components/CodeBlock.js";
import { DiffView } from "../components/DiffView.js";
import { KeyHints } from "../components/KeyHints.js";

interface DetailViewProps {
  onBack: () => void;
  onQuit: () => void;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "red";
    case "high": return "yellow";
    case "medium": return "blue";
    case "low": return "green";
    default: return "white";
  }
}

export function DetailView({ onBack, onQuit }: DetailViewProps): React.ReactElement {
  const { state, dispatch } = useTui();
  const { filteredFindings, focusedIndex, selectedIds } = state;
  const finding = filteredFindings[focusedIndex];

  useKeyboard({
    back: onBack,
    quit: onQuit,
    select: () => {
      if (finding) dispatch({ type: "TOGGLE_SELECTED", id: finding.id });
    },
    execute: onBack,
    up: () => dispatch({ type: "MOVE_FOCUS", delta: -1 }),
    down: () => dispatch({ type: "MOVE_FOCUS", delta: 1 }),
  });

  if (!finding) {
    return (
      <Box>
        <Text>No finding selected.</Text>
      </Box>
    );
  }

  const isSelected = selectedIds.has(finding.id);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>{finding.title}</Text>
        <Text> </Text>
        <Text color={severityColor(finding.severity)}>[{finding.severity.toUpperCase()}]</Text>
        {isSelected && <Text color="green"> [SELECTED]</Text>}
      </Box>
      <Box>
        <Text dimColor>{finding.file}:{finding.line}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>{finding.description}</Text>
      </Box>
      {finding.evidence && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Evidence:</Text>
          <CodeBlock code={finding.evidence} startLine={finding.line} />
        </Box>
      )}
      {finding.suggestion && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Suggestion:</Text>
          <Text>{finding.suggestion}</Text>
        </Box>
      )}
      {finding.fix && finding.fix.diff.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Proposed Fix:</Text>
          <DiffView diff={finding.fix.diff[0]!} />
        </Box>
      )}
      {finding.references && finding.references.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>References:</Text>
          {finding.references.map((ref, i) => (
            <Text key={i} dimColor>{ref}</Text>
          ))}
        </Box>
      )}
      <KeyHints />
    </Box>
  );
}
