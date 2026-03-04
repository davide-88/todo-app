import { useState } from "react";
import { Input } from "@/components/ui/input.js";
import { Button } from "@/components/ui/button.js";

interface InputAreaProps {
  onSubmit: (text: string) => void;
}

export const InputArea = ({ onSubmit }: InputAreaProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="What needs to be done?"
        aria-label="New todo text"
        className="flex-1 border-input focus:border-primary bg-muted/50"
      />
      <Button onClick={handleSubmit}>Add Todo</Button>
    </div>
  );
};
