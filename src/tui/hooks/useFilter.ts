import { useMemo } from "react";
import type { Finding } from "../../types/finding.js";
import type { Filters } from "../state.js";

export function useFilter(findings: Finding[], filters: Filters): Finding[] {
  return useMemo(() => {
    return findings.filter((f) => {
      if (filters.severity !== "all" && f.severity !== filters.severity) {
        return false;
      }
      if (filters.mode !== "all" && f.mode !== filters.mode) {
        return false;
      }
      if (filters.fixable === "fixable" && !f.fix) {
        return false;
      }
      if (
        filters.fixable === "auto-fixable" &&
        (!f.fix || f.fix.confidence !== "high")
      ) {
        return false;
      }
      if (filters.search) {
        const haystack =
          `${f.title} ${f.file} ${f.description}`.toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [findings, filters]);
}
