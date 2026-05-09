import { createContext, useContext } from "react";
import type { ScanResult } from "../types/scan.js";
import type { Finding } from "../types/finding.js";

export interface Filters {
  severity: string;
  mode: string;
  fixable: "all" | "fixable" | "auto-fixable";
  search: string;
}

export const defaultFilters: Filters = {
  severity: "all",
  mode: "all",
  fixable: "all",
  search: "",
};

export interface TuiState {
  scanResult: ScanResult;
  filters: Filters;
  selectedIds: Set<string>;
  focusedIndex: number;
  filteredFindings: Finding[];
}

export const TuiContext = createContext<{
  state: TuiState;
  dispatch: (action: TuiAction) => void;
}>(null!);

export type TuiAction =
  | { type: "SET_FILTER"; filters: Partial<Filters> }
  | { type: "TOGGLE_SELECTED"; id: string }
  | { type: "SELECT_ALL" }
  | { type: "SELECT_NONE" }
  | { type: "SET_FOCUS"; index: number }
  | { type: "MOVE_FOCUS"; delta: number };

export function useTui() {
  return useContext(TuiContext);
}
