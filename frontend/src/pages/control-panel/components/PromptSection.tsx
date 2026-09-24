import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PromptItem } from "@/pages/control-panel/types";

interface PromptSectionProps {
  title: string;
  description: string;
  prompts: PromptItem[];
  editingPromptId: number | null;
  savingPromptId: number | null;
  deletingPromptId: number | null;
  editTitle: string;
  editContent: string;
  editGlobal: boolean;
  isAdmin: boolean;
  onBeginEdit: (prompt: PromptItem) => void;
  onSavePrompt: (prompt: PromptItem) => void | Promise<void>;
  onDeletePrompt: (prompt: PromptItem) => void | Promise<void>;
  onCancelEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditGlobalChange: (value: boolean) => void;
  emptyText: string;
}

export function PromptSection({
  title,
  description,
  prompts,
  editingPromptId,
  savingPromptId,
  deletingPromptId,
  editTitle,
  editContent,
  editGlobal,
  isAdmin,
  onBeginEdit,
  onSavePrompt,
  onDeletePrompt,
  onCancelEdit,
  onEditTitleChange,
  onEditContentChange,
  onEditGlobalChange,
  emptyText,
}: PromptSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {prompts.length > 0 ? (
        prompts.map((prompt) => {
          const isEditing = editingPromptId === prompt.id && prompt.can_manage;
          const isBusy = savingPromptId === prompt.id || deletingPromptId === prompt.id;

          return (
            <div key={prompt.id} className="rounded-lg border p-4 space-y-3">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`prompt-title-${prompt.id}`}>Titel</Label>
                    <Input
                      id={`prompt-title-${prompt.id}`}
                      value={editTitle}
                      onChange={(event) => onEditTitleChange(event.target.value)}
                      maxLength={160}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`prompt-content-${prompt.id}`}>Prompt</Label>
                    <Textarea
                      id={`prompt-content-${prompt.id}`}
                      rows={5}
                      value={editContent}
                      onChange={(event) => onEditContentChange(event.target.value)}
                      maxLength={8000}
                    />
                  </div>
                  {isAdmin && (
                    <Label className="flex items-center gap-2 text-sm font-normal">
                      <input
                        type="checkbox"
                        checked={editGlobal}
                        onChange={(event) => onEditGlobalChange(event.target.checked)}
                        className="size-4"
                      />
                      Globale prompt (zichtbaar voor iedereen)
                    </Label>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void onSavePrompt(prompt)} disabled={isBusy}>
                      {savingPromptId === prompt.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Opslaan...
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          Opslaan
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelEdit} disabled={isBusy}>
                      <X className="size-4" />
                      Annuleren
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{prompt.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Laatst bijgewerkt: {formatDate(prompt.updated_at)}
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {prompt.is_global ? "Globaal" : "Prive"}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-foreground/90">{prompt.content}</div>
                  {prompt.can_manage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onBeginEdit(prompt)} disabled={isBusy}>
                        <Pencil className="size-4" />
                        Bewerken
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void onDeletePrompt(prompt)} disabled={isBusy}>
                        {deletingPromptId === prompt.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Verwijderen
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Alleen-lezen prompt</div>
                  )}
                </>
              )}
            </div>
          );
        })
      ) : (
        <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          {emptyText}
        </div>
      )}
    </div>
  );
}
