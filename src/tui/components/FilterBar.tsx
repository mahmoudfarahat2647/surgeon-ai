import React from "react";
import { Box, Text } from "ink";
import type { Filters } from "../state.js";

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
}

const SEVERITIES = ["all", "critical", "high", "medium", "low", "info"];
const FIXABLE_OPTIONS: Array<Filters["fixable"]> = [
  "all",
  "fixable",
  "auto-fixable",
];

export function FilterBar({ filters }: FilterBarProps): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text>{"Severity: "}</Text>
        {SEVERITIES.map((s) => (
          <Box key={s} marginRight={1}>
            <Text
              bold={filters.severity === s}
              inverse={filters.severity === s}
            >
              {s}
            </Text>
          </Box>
        ))}
      </Box>
      <Box>
        <Text>{"Fixable:  "}</Text>
        {FIXABLE_OPTIONS.map((opt) => (
          <Box key={opt} marginRight={1}>
            <Text
              bold={filters.fixable === opt}
              inverse={filters.fixable === opt}
            >
              {opt}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
