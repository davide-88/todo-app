import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button.js";

interface AppHeaderProps {
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
}

export const AppHeader = ({ sortOrder, onToggleSort }: AppHeaderProps) => {
  const sortLabel = sortOrder === "desc" ? "Newest first" : "Oldest first";

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <h1 className="text-[20px] font-semibold leading-none">todos</h1>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleSort}
        aria-label={`Sort order: ${sortLabel.toLowerCase()}`}
      >
        <ArrowUpDown className="h-4 w-4" />
        {sortLabel}
      </Button>
    </header>
  );
};
