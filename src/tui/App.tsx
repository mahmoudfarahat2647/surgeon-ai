import React, { useState, useReducer, useMemo } from "react";
import { render, Box, Text } from "ink";
import type { ScanResult } from "../types/scan.js";
import type { Finding } from "../types/finding.js";
import {
  TuiContext,
  defaultFilters,
  type TuiState,
  type TuiAction,
  type Filters,
} from "./state.js";
import { ListView } from "./views/ListView.js";
import { DetailView } from "./views/DetailView.js";
import { SummaryView } from "./views/SummaryView.js";
import fs from "fs/promises";
import path from "path";

function filterFindings(findings: Finding[], filters: Filters): Finding[] {
  return findings.filter((f) => {
    if (filters.severity !== "all" && f.severity !== filters.severity) return false;
    if (filters.mode !== "all" && f.mode !== filters.mode) return false;
    if (filters.fixable === "fixable" && !f.fix) return false;
    if (filters.fixable === "auto-fixable" && (!f.fix || f.fix.confidence !== "high")) return false;
    if (filters.search && !`${f.title} ${f.file} ${f.description}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

function reducer(state: TuiState, action: TuiAction): TuiState {
  switch (action.type) {
    case "SET_FILTER": {
      const filters = { ...state.filters, ...action.filters };
      const all = [...state.scanResult.findings, ...state.scanResult.crossModuleFindings];
      return { ...state, filters, filteredFindings: filterFindings(all, filters), focusedIndex: 0 };
    }
    case "TOGGLE_SELECTED": {
      const next = new Set(state.selectedIds);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, selectedIds: next };
    }
    case "SELECT_ALL":
      return { ...state, selectedIds: new Set(state.filteredFindings.map((f) => f.id)) };
    case "SELECT_NONE":
      return { ...state, selectedIds: new Set() };
    case "SET_FOCUS":
      return { ...state, focusedIndex: Math.max(0, Math.min(action.index, state.filteredFindings.length - 1)) };
    case "MOVE_FOCUS":
      return { ...state, focusedIndex: Math.max(0, Math.min(state.focusedIndex + action.delta, state.filteredFindings.length - 1)) };
    default:
      return state;
  }
}

function App({ scanResult }: { scanResult: ScanResult }): React.ReactElement {
  const [view, setView] = useState<"list" | "detail" | "summary">("list");
  const allFindings = useMemo(
    () => [...scanResult.findings, ...scanResult.crossModuleFindings],
    [scanResult]
  );

  const [state, dispatch] = useReducer(reducer, {
    scanResult,
    filters: defaultFilters,
    selectedIds: new Set<string>(),
    focusedIndex: 0,
    filteredFindings: allFindings,
  });

  const handleQuit = async () => {
    if (state.selectedIds.size > 0) {
      const selection = {
        scanId: scanResult.meta.timestamp,
        timestamp: new Date().toISOString(),
        selectedIds: [...state.selectedIds],
      };
      await fs.writeFile(
        path.resolve(".surgeon", "selected-fixes.json"),
        JSON.stringify(selection, null, 2),
        "utf-8"
      );
    }
    process.exit(0);
  };

  return (
    <TuiContext.Provider value={{ state, dispatch }}>
      <Box flexDirection="column">
        {view === "list" && (
          <ListView
            onSelectDetail={(idx) => {
              dispatch({ type: "SET_FOCUS", index: idx });
              setView("detail");
            }}
            onExecute={() => setView("summary")}
            onQuit={handleQuit}
          />
        )}
        {view === "detail" && <DetailView onBack={() => setView("list")} />}
        {view === "summary" && (
          <SummaryView onBack={() => setView("list")} onQuit={handleQuit} />
        )}
      </Box>
    </TuiContext.Provider>
  );
}

export function renderApp(scanResult: ScanResult): void {
  render(<App scanResult={scanResult} />);
}
