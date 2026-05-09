import React from "react";
import { Box, Text } from "ink";
import { useTui } from "../state.js";
import { useKeyboard } from "../hooks/useKeyboard.js";
import { HealthBar } from "../components/HealthBar.js";
import { KeyHints } from "../components/KeyHints.js";

interface SummaryViewProps {
  onBack: () => void;
  onQuit: () => void;
}

export function SummaryView({ onBack, onQuit }: SummaryViewProps): React.ReactElement {
  const { state } = useTui();
  const { selectedIds, filteredFindings, scanResult } = state;

  const selectedFindings = filteredFindings.filter((f) => selectedIds.has(f.id));
  const currentScore = scanResult.summary.healthScore;
  const autoFixableCount = selectedFindings.filter(
    (f) => f.fix && f.fix.confidence === "high"
  ).length;
  const estimatedImprovement = Math.min(autoFixableCount * 2, 100 - currentScore);
  const projectedScore = Math.min(currentScore + estimatedImprovement, 100);

  useKeyboard({
    back: onBack,
    quit: () => void onQuit(),
    execute: () => void onQuit(),
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Summary — Selected Fixes</Text>
      </Box>
      <Box>
        <Text>Selected: </Text>
        <Text color="green" bold>{selectedFindings.length}</Text>
        <Text> findings</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {selectedFindings.length === 0 ? (
          <Text dimColor>No findings selected.</Text>
        ) : (
          selectedFindings.map((f, i) => (
            <Box key={f.id}>
              <Text dimColor>{`  ${i + 1}. `}</Text>
              <Text>{f.title}</Text>
              <Text dimColor>{` (${f.severity})`}</Text>
            </Box>
          ))
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Health Score Impact:</Text>
        <HealthBar score={currentScore} />
        {estimatedImprovement > 0 && (
          <Box>
            <Text>{"Projected after fixes: "}</Text>
            <Text color="green">{projectedScore}/100</Text>
            <Text color="green">{` (+${estimatedImprovement})`}</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[Enter/y] Save and exit  [b/Esc] Back</Text>
      </Box>
      <KeyHints />
    </Box>
  );
}
