type StatusDotVariant = "syncing" | "error" | "hidden";

interface StatusDotProps {
  variant: StatusDotVariant;
}

export const StatusDot = ({ variant }: StatusDotProps) => {
  if (variant === "hidden") return null;

  const isSyncing = variant === "syncing";

  return (
    <div
      role="status"
      aria-label={isSyncing ? "Syncing" : "Error"}
      className={[
        "h-2 w-2 rounded-full shrink-0",
        isSyncing
          ? "bg-[hsl(var(--syncing))] animate-pulse motion-reduce:animate-none"
          : "bg-destructive",
      ].join(" ")}
    />
  );
};
