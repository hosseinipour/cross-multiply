import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { SessionState } from "../appState";
import { describeCell, getCellBlock } from "../cellState";
import { getVisibleTarget } from "../game";
import type { CellRef } from "../scene/Board";

const ARROW_STEPS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/**
 * Real buttons behind the canvas so the board works with a keyboard and a
 * screen reader. Focus drives the 3D cursor.
 */
export function AccessibleGrid({
  session,
  onPress,
  onFocusCell,
}: {
  session: SessionState;
  onPress: (row: number, col: number, alternate: boolean) => void;
  onFocusCell: (cell: CellRef | null) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<CellRef>({ row: 0, col: 0 });
  const { puzzle } = session;

  // Arrow keys anywhere on the page jump into the board.
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        !ARROW_STEPS[event.key] ||
        document.querySelector('[role="dialog"]') ||
        gridRef.current?.contains(document.activeElement)
      ) {
        return;
      }

      const active = document.activeElement;
      if (active && active !== document.body && active.tagName !== "CANVAS") {
        return;
      }

      event.preventDefault();
      const { row, col } = lastFocus.current;
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-cell="${Math.min(row, puzzle.size - 1)}-${Math.min(col, puzzle.size - 1)}"]`)
        ?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [puzzle.size]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
    if (event.key === "x" || event.key === "X") {
      event.preventDefault();
      event.stopPropagation();
      onPress(row, col, true);
      return;
    }

    const step = ARROW_STEPS[event.key];
    if (!step) {
      return;
    }

    event.preventDefault();
    const nextRow = Math.max(0, Math.min(puzzle.size - 1, row + step[0]));
    const nextCol = Math.max(0, Math.min(puzzle.size - 1, col + step[1]));
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${nextRow}-${nextCol}"]`)
      ?.focus();
  };

  const targetLabel = (axis: "row" | "column", index: number) => {
    const target = getVisibleTarget(puzzle, session.marks, axis, index);
    return target === null ? "hidden" : String(target);
  };

  return (
    <div
      ref={gridRef}
      className="sr-only"
      role="group"
      aria-label="Puzzle board"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onFocusCell(null);
        }
      }}
    >
      {session.marks.map((line, row) => (
        <div key={row} role="group" aria-label={`Row ${row + 1}, target ${targetLabel("row", row)}`}>
          {line.map((mark, col) => {
            const open = mark === "hidden" && !getCellBlock(session, row, col);
            return (
              <button
                key={col}
                type="button"
                data-cell={`${row}-${col}`}
                aria-disabled={!open || session.status !== "playing"}
                aria-label={`${describeCell(session, row, col)}. Column target ${targetLabel("column", col)}`}
                onFocus={() => {
                  lastFocus.current = { row, col };
                  onFocusCell({ row, col });
                }}
                onClick={() => onPress(row, col, false)}
                onKeyDown={(event) => handleKeyDown(event, row, col)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
