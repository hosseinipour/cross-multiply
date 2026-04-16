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
          className={`flex h-8 w-8 items-center justify-center rounded-full border ${
            index < hearts
              ? "border-rose-400/30 bg-rose-400/15 text-rose-400"
              : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-faint)]"
          }`}
        >
          <Heart className="h-4 w-4 fill-current" strokeWidth={1.8} />
        </span>
      ))}
    </div>
  );
}
