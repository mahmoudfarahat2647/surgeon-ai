import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "type to search...",
}: SearchInputProps): React.ReactElement {
  const [active] = useState(true);

  useInput(
    useCallback(
      (input, key) => {
        if (!active) return;
        if (key.backspace || key.delete) {
          onChange(value.slice(0, -1));
          return;
        }
        // Only accept printable characters (not special keys)
        if (!key.ctrl && !key.meta && !key.upArrow && !key.downArrow &&
            !key.leftArrow && !key.rightArrow && !key.return && !key.escape &&
            input.length === 1) {
          onChange(value + input);
        }
      },
      [active, value, onChange]
    )
  );

  const display = value || placeholder;
  const isPlaceholder = !value;

  return (
    <Box paddingX={1}>
      <Text>{"Search: ["}</Text>
      <Text dimColor={isPlaceholder}>{display}</Text>
      <Text>{"]"}</Text>
    </Box>
  );
}
