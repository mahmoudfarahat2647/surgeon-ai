import React from "react";
import { Box, Text, useInput } from "ink";
import type { Filters } from "../state.js";

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
}

const SEVERITIES: Array<Filters["severity"]> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
  "info",
];
const FIXABLE_OPTIONS: Array<Filters["fixable"]> = [
  "all",
  "fixable",
  "auto-fixable",
];

export function FilterBar({ filters, onChange }: FilterBarProps): React.ReactElement {
  useInput((input) => {
    if (input === "s") {
      const idx = SEVERITIES.indexOf(filters.severity);
      const next = SEVERITIES[(idx + 1) % SEVERITIES.length]!;
      onChange({ severity: next });
    }
    if (input === "f") {
      const idx = FIXABLE_OPTIONS.indexOf(filters.fixable);
      const next = FIXABLE_OPTIONS[(idx + 1) % FIXABLE_OPTIONS.length]!;
      onChange({ fixable: next });
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text>{"Severity [s]: "}</Text>
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
        <Text>{"Fixable  [f]: "}</Text>
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
