import React from "react";
import { Box, Text } from "ink";
import type { Finding } from "../../types/finding.js";

interface FindingRowProps {
  finding: Finding;
  isFocused: boolean;
  isSelected: boolean;
  index: number;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "red";
    case "high":
      return "yellow";
    case "medium":
      return "blue";
    case "low":
      return "green";
    default:
      return "white";
  }
}

export function FindingRow({
  finding,
  isFocused,
  isSelected,
  index,
}: FindingRowProps): React.ReactElement {
  const checkbox = isSelected ? "[x]" : "[ ]";
  const num = `#${index + 1}`;
  const sev = `[${finding.severity.toUpperCase()}]`;
  const loc = `${finding.file}:${finding.line}`;
  const label = `${checkbox} ${num} `;
  const title = finding.title;
  const suffix = ` (${loc})`;

  return (
    <Box>
      <Text bold={isFocused} inverse={isFocused}>
        {label}
      </Text>
      <Text
        bold={isFocused}
        inverse={isFocused}
        color={severityColor(finding.severity)}
      >
        {sev}{" "}
      </Text>
      <Text bold={isFocused} inverse={isFocused}>
        {title}
      </Text>
      <Text bold={isFocused} inverse={isFocused} dimColor={!isFocused}>
        {suffix}
      </Text>
    </Box>
  );
}
