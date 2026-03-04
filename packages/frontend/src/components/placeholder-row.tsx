interface PlaceholderRowProps {
  widthPercent?: number;
}

export const PlaceholderRow = ({ widthPercent = 60 }: PlaceholderRowProps) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[48px]" role="listitem">
      <div className="h-[18px] w-[18px] rounded border border-border shrink-0" />
      <div
        className="h-4 rounded bg-border"
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  );
};
