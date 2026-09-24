import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";

interface SpeakerLabelProps {
  speaker: string;
  displayName: string;
  colorClass: string;
  canEdit: boolean;
  onRename: (speaker: string, newName: string) => void;
}

export function SpeakerLabel({
  speaker,
  displayName,
  colorClass,
  canEdit,
  onRename,
}: SpeakerLabelProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(displayName);
  }, [displayName]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== displayName) {
      onRename(speaker, trimmed);
    } else {
      setValue(displayName);
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          className="w-28 rounded border border-slate-300 px-1 py-0 text-sm font-semibold outline-none focus:border-blue-400"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              setValue(displayName);
              setEditing(false);
            }
          }}
        />
        <button type="button" onClick={commit} className="text-slate-400 hover:text-slate-600">
          <Check className="size-3" />
        </button>
      </span>
    );
  }

  return (
    <span className={`font-semibold ${colorClass}`}>
      {displayName}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-1 inline-flex align-middle text-slate-300 hover:text-slate-500"
        >
          <Pencil className="size-3" />
        </button>
      )}
      :{" "}
    </span>
  );
}
