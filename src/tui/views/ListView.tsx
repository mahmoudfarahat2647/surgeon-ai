import React, { useCallback } from "react";
import { Box, Text } from "ink";
import { useTui } from "../state.js";
import { useKeyboard } from "../hooks/useKeyboard.js";
import { useScroll } from "../hooks/useScroll.js";
import { HealthBar } from "../components/HealthBar.js";
import { FilterBar } from "../components/FilterBar.js";
import { FindingRow } from "../components/FindingRow.js";
import { KeyHints } from "../components/KeyHints.js";
import { SearchInput } from "../components/SearchInput.js";
import type { Filters } from "../state.js";

interface ListViewProps {
  onSelectDetail: (idx: number) => void;
  onExecute: () => void;
  onQuit: () => void;
}

const VIEWPORT_HEIGHT = 15;

export function ListView({
  onSelectDetail,
  onExecute,
  onQuit,
}: ListViewProps): React.ReactElement {
  const { state, dispatch } = useTui();
  const { filteredFindings, focusedIndex, selectedIds, filters, scanResult } = state;

  const { visibleStart, visibleEnd } = useScroll(
    filteredFindings.length,
    VIEWPORT_HEIGHT,
    focusedIndex
  );

  const handleFilterChange = useCallback(
    (f: Partial<Filters>) => dispatch({ type: "SET_FILTER", filters: f }),
    [dispatch]
  );

  const handleSearch = useCallback(
    (v: string) => dispatch({ type: "SET_FILTER", filters: { search: v } }),
    [dispatch]
  );

  useKeyboard({
    up: () => dispatch({ type: "MOVE_FOCUS", delta: -1 }),
    down: () => dispatch({ type: "MOVE_FOCUS", delta: 1 }),
    select: () => {
      const f = filteredFindings[focusedIndex];
      if (f) dispatch({ type: "TOGGLE_SELECTED", id: f.id });
    },
    execute: () => {
      if (selectedIds.size > 0) {
        onExecute();
      } else {
        onSelectDetail(focusedIndex);
      }
    },
    quit: () => void onQuit(),
    selectAll: () => dispatch({ type: "SELECT_ALL" }),
    selectNone: () => dispatch({ type: "SELECT_NONE" }),
    back: () => {},
  });

  const score = scanResult.summary.healthScore;

  return (
    <Box flexDirection="column">
      <HealthBar score={score} />
      <FilterBar filters={filters} onChange={handleFilterChange} />
      <SearchInput value={filters.search} onChange={handleSearch} />
      <Box flexDirection="column">
        {filteredFindings.length === 0 ? (
          <Box paddingX={1}>
            <Text dimColor>No findings match filters</Text>
          </Box>
        ) : (
          filteredFindings.slice(visibleStart, visibleEnd).map((f, relIdx) => {
            const absIdx = visibleStart + relIdx;
            return (
              <FindingRow
                key={f.id}
                finding={f}
                index={absIdx}
                isFocused={absIdx === focusedIndex}
                isSelected={selectedIds.has(f.id)}
              />
            );
          })
        )}
      </Box>
      <KeyHints />
    </Box>
  );
}
