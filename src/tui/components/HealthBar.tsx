import React from "react";
import { Box, Text } from "ink";

interface HealthBarProps {
  score: number;
}

export function HealthBar({ score }: HealthBarProps): React.ReactElement {
  const barWidth = 20;
  const filled = Math.round((score / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = "#".repeat(filled) + "-".repeat(empty);

  let color: string;
  if (score >= 70) {
    color = "green";
  } else if (score >= 40) {
    color = "yellow";
  } else {
    color = "red";
  }

  return (
    <Box>
      <Text>{"Health: ["}</Text>
      <Text color={color}>{bar}</Text>
      <Text>{"] "}</Text>
      <Text color={color}>
        {score}/{100}
      </Text>
    </Box>
  );
}
