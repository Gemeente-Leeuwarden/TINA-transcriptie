import { type Dispatch, type SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PurposePromptOption } from "@/pages/admin/types";

export interface PurposeFormState {
  title: string;
  description: string;
  promptId: number | null;
  inviteParticipants: boolean;
  allowAppRecording: boolean;
  audioHours: number;
  transcriptionHours: number;
  promptsHours: number;
}

function parseHoursInput(value: string): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

interface PurposeFormProps {
  form: PurposeFormState;
  onChange: Dispatch<SetStateAction<PurposeFormState>>;
  promptOptions: PurposePromptOption[];
  promptError: string | null;
  isLoadingPrompts: boolean;
  idPrefix: string;
}

export function PurposeForm({
  form,
  onChange,
  promptOptions,
  promptError,
  isLoadingPrompts,
  idPrefix,
}: PurposeFormProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>Titel</Label>
          <Input
            id={`${idPrefix}-title`}
            value={form.title}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                title: event.target.value,
              }))
            }
            placeholder="Bijv. Medisch overleg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-prompt`}>Prompt</Label>
          <select
            id={`${idPrefix}-prompt`}
            value={form.promptId ?? ""}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                promptId: event.target.value ? Number(event.target.value) : null,
              }))
            }
            disabled={isLoadingPrompts}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
          >
            <option value="">Kies prompt</option>
            {promptOptions.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.title}
              </option>
            ))}
          </select>
          {isLoadingPrompts && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Prompts laden...
            </div>
          )}
          {promptError && <div className="text-xs text-destructive">{promptError}</div>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Omschrijving</Label>
        <Textarea
          id={`${idPrefix}-description`}
          value={form.description}
          onChange={(event) =>
            onChange((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
          placeholder="Waarvoor wordt deze sessie gebruikt?"
          rows={4}
        />
      </div>

      <div className="rounded-md border bg-background/70 p-4">
        <div className="text-sm font-medium">Beperkingen</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.inviteParticipants}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  inviteParticipants: event.target.checked,
                }))
              }
              className="mt-0.5 size-4 accent-foreground"
            />
            <span>Uitnodigen van deelnemers toestaan</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowAppRecording}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  allowAppRecording: event.target.checked,
                }))
              }
              className="mt-0.5 size-4 accent-foreground"
            />
            <span>App/tab-audio opnemen toestaan</span>
          </label>
        </div>
      </div>

      <div className="rounded-md border bg-background/70 p-4">
        <div className="text-sm font-medium">Retentie (uren)</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-retention-audio`}>Audio</Label>
            <Input
              id={`${idPrefix}-retention-audio`}
              type="number"
              min={0}
              value={form.audioHours}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  audioHours: parseHoursInput(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-retention-transcription`}>Transcriptie</Label>
            <Input
              id={`${idPrefix}-retention-transcription`}
              type="number"
              min={0}
              value={form.transcriptionHours}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  transcriptionHours: parseHoursInput(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-retention-prompts`}>Prompts</Label>
            <Input
              id={`${idPrefix}-retention-prompts`}
              type="number"
              min={0}
              value={form.promptsHours}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  promptsHours: parseHoursInput(event.target.value),
                }))
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
