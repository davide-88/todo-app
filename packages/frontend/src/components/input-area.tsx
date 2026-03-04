import { useState, useRef } from "react";
import { Input } from "@/components/ui/input.js";
import { Button } from "@/components/ui/button.js";
import { maxTextLength } from "@todo-app/shared";

interface InputAreaProps {
  onSubmit: (text: string) => void;
}

export const InputArea = ({ onSubmit }: InputAreaProps) => {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (value.trim() === "") {
      setValidationError("Todo text is required");
      return;
    }
    if (value.length > maxTextLength) {
      setValidationError("Text exceeds maximum length");
      return;
    }
    onSubmit(value.trim());
    setValue("");
    setValidationError(null);
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (newValue.length > maxTextLength) {
      setValidationError("Text exceeds maximum length");
    } else if (validationError) {
      setValidationError(null);
    }
  };

  const errorId = validationError ? "input-area-error" : undefined;

  return (
    <div className="flex flex-col px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="What needs to be done?"
          aria-label="New todo text"
          aria-describedby={errorId}
          aria-invalid={validationError ? true : undefined}
          className={`flex-1 bg-muted/50 ${validationError ? "border-destructive" : "border-input focus:border-primary"}`}
        />
        <Button onClick={handleSubmit}>Add Todo</Button>
      </div>
      {validationError && (
        <p
          id="input-area-error"
          role="alert"
          className="text-[13px] pt-1 text-destructive"
        >
          {validationError}
        </p>
      )}
    </div>
  );
};
