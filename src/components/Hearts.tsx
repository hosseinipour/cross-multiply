import { Heart } from "lucide-react";

export function Hearts({
  hearts,
  maxHearts,
}: {
  hearts: number;
  maxHearts: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: maxHearts }, (_, index) => (
        <span
          key={index}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
            index < hearts
              ? "border-[var(--berry)]/35 bg-[color-mix(in_oklch,var(--berry)_18%,transparent)] text-[var(--berry)] shadow-[0_6px_14px_var(--shadow-soft)]"
              : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-faint)]"
          }`}
        >
          <Heart className="h-4 w-4 fill-current" strokeWidth={1.8} />
        </span>
      ))}
    </div>
  );
}
