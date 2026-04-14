import type { ComponentPropsWithoutRef } from "react";
import { vibrateOnButtonPress } from "./haptics";

type HapticButtonProps = ComponentPropsWithoutRef<"button"> & {
  haptic?: "button" | "none";
};

export function HapticButton({
  haptic = "button",
  onClick,
  ...props
}: HapticButtonProps) {
  return (
    <button
      {...props}
      onClick={(event) => {
        if (haptic === "button") {
          vibrateOnButtonPress();
        }

        onClick?.(event);
      }}
    />
  );
}
