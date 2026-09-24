import type { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurposeForm, type PurposeFormState } from "@/pages/admin/components/PurposeForm";
import type { AdminPurposeItem, PurposePromptOption } from "@/pages/admin/types";
import { summarizePrompt } from "@/pages/admin/utils";

interface PurposeListItemProps {
  purpose: AdminPurposeItem;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  editForm: PurposeFormState;
  promptOptions: PurposePromptOption[];
  promptError: string | null;
  isLoadingPrompts: boolean;
  onEditFormChange: Dispatch<SetStateAction<PurposeFormState>>;
  onBeginEdit: (purpose: AdminPurposeItem) => void;
  onCancelEdit: () => void;
  onSave: (purposeId: number) => void;
  onDelete: (purposeId: number) => void;
}

export function PurposeListItem({
  purpose,
  isEditing,
  isSaving,
  isDeleting,
  editForm,
  promptOptions,
  promptError,
  isLoadingPrompts,
  onEditFormChange,
  onBeginEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: PurposeListItemProps) {
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      {isEditing ? (
        <div className="space-y-3">
          <PurposeForm
            form={editForm}
            onChange={onEditFormChange}
            promptOptions={promptOptions}
            promptError={promptError}
            isLoadingPrompts={isLoadingPrompts}
            idPrefix={`edit-purpose-${purpose.id}`}
          />

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancelEdit}
              disabled={isSaving}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              onClick={() => onSave(purpose.id)}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Opslaan...
                </>
              ) : (
                "Opslaan"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{purpose.title}</div>
              <div className="text-xs text-muted-foreground">
                Prompt: {purpose.prompt?.title ?? `#${purpose.prompt_id}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onBeginEdit(purpose)}
                disabled={isDeleting}
              >
                Bewerken
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onDelete(purpose.id)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Verwijderen"
                )}
              </Button>
            </div>
          </div>

          <div className="whitespace-pre-wrap text-sm text-foreground/90">
            {summarizePrompt(purpose.description)}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Uitnodigen: {purpose.limitations?.invite_participants ? "Ja" : "Nee"}</span>
            <span>App-opname: {purpose.limitations?.allow_app_recording ? "Ja" : "Nee"}</span>
            <span>
              Retentie:{" "}
              {purpose.retention
                ? `Audio ${purpose.retention.audio_hours}u · Transcriptie ${purpose.retention.transcription_hours}u · Prompts ${purpose.retention.prompts_hours}u`
                : "n.v.t."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
