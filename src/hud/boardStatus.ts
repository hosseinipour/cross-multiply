import { evaluateMissions, getRunSummary, type SessionState } from "../appState";
import type { MissionId } from "../progression";
import {
  countMatchedTargetsOnAxis,
  getCorrectMarkCount,
  getDelayedCellProgress,
  getFactorCipherProgress,
  getSpotlightProgress,
  isHintGateUnlocked,
} from "../game";

export type StatusTone = "danger" | "sky" | "lemon" | "berry" | "accent";
export type StatusIcon = "lock" | "shield" | "bulb" | "spark" | "eye";

export type BoardStatus = {
  key: string;
  icon: StatusIcon;
  label: string;
  tone: StatusTone;
  rank: number;
};

/** Live constraints worth surfacing right now, most urgent first. */
export function getBoardStatuses(session: SessionState): BoardStatus[] {
  const { puzzle, marks } = session;
  const statuses: BoardStatus[] = [];
  const correctMarks = getCorrectMarkCount(puzzle, marks);

  if (session.noEchoLine) {
    statuses.push({
      key: "no-echo",
      icon: "shield",
      label: `Next mark off ${session.noEchoLine.axis} ${session.noEchoLine.index + 1}`,
      tone: "danger",
      rank: 95,
    });
  }

  if (session.activeCommitment) {
    statuses.push({
      key: "commitment",
      icon: "lock",
      label: `Stay on ${session.activeCommitment.axis} ${session.activeCommitment.index + 1}`,
      tone: "sky",
      rank: 92,
    });
  }

  if (session.toolLocked) {
    statuses.push({
      key: "tool-lock",
      icon: "shield",
      label: "Erase locked until a target matches",
      tone: "lemon",
      rank: 90,
    });
  }

  if (puzzle.hintGate && !isHintGateUnlocked(puzzle, marks)) {
    statuses.push({
      key: "hint-gate",
      icon: "bulb",
      label: `Hints ${correctMarks}/${puzzle.hintGate.unlockAfterCorrectMarks}`,
      tone: "lemon",
      rank: 88,
    });
  }

  const spotlight = getSpotlightProgress(puzzle, marks);
  if (spotlight && !spotlight.complete) {
    statuses.push({
      key: "spotlight",
      icon: "spark",
      label: `Spotlight ${spotlight.axis} ${spotlight.index + 1}: ${spotlight.current}/${spotlight.required}`,
      tone: "lemon",
      rank: 86,
    });
  }

  const sealed = getDelayedCellProgress(puzzle, marks, puzzle.sealedCells);
  if (sealed && !sealed.unlocked) {
    statuses.push({
      key: "seals",
      icon: "lock",
      label: `Seals ${sealed.current}/${sealed.required}`,
      tone: "sky",
      rank: 70,
    });
  }

  const cloaked = getDelayedCellProgress(puzzle, marks, puzzle.cloakedCells);
  if (cloaked && !cloaked.unlocked) {
    statuses.push({
      key: "cloaks",
      icon: "eye",
      label: `Cloaks ${cloaked.current}/${cloaked.required}`,
      tone: "berry",
      rank: 68,
    });
  }

  if (puzzle.crossBlind) {
    const visibleAxis = puzzle.crossBlind.hiddenAxis === "row" ? "column" : "row";
    const matched = countMatchedTargetsOnAxis(puzzle, marks, visibleAxis);
    if (matched < puzzle.crossBlind.unlockAfterMatchedVisibleLines) {
      statuses.push({
        key: "cross-blind",
        icon: "eye",
        label: `${puzzle.crossBlind.hiddenAxis === "row" ? "Rows" : "Columns"} hidden ${matched}/${puzzle.crossBlind.unlockAfterMatchedVisibleLines}`,
        tone: "berry",
        rank: 66,
      });
    }
  }

  const cipher = getFactorCipherProgress(puzzle, marks);
  if (cipher && !cipher.unlocked) {
    statuses.push({
      key: "factor-cipher",
      icon: "spark",
      label: `Cipher ${cipher.current}/${cipher.required}`,
      tone: "accent",
      rank: 64,
    });
  }

  return statuses.sort((a, b) => b.rank - a.rank);
}

export type MissionState = "onTrack" | "failed";

/** Whether each mission can still be earned on this run. */
export function getMissionState(session: SessionState, missionId: MissionId): MissionState {
  const earned = evaluateMissions(
    session.puzzle,
    getRunSummary(session),
    session.eraseUsedBeforeRowsResolved,
  );

  return earned.includes(missionId) ? "onTrack" : "failed";
}
