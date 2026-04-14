export function vibrate(pattern: number | number[]) {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }

  navigator.vibrate(pattern);
}

export function vibrateOnCorrectPick() {
  vibrate(8);
}

export function vibrateOnMistake() {
  vibrate(28);
}

export function vibrateOnButtonPress() {
  vibrate(8);
}
