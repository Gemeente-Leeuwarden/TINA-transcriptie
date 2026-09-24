import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Globe, Loader2, Plus } from "lucide-react";
import {
  createPromptApi,
  deletePromptApi,
  fetchPromptsApi,
  updatePromptApi,
} from "@/pages/control-panel/api";
import type { PromptItem } from "@/pages/control-panel/types";
import { PromptSection } from "@/pages/control-panel/components/PromptSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface PromptManagerCardProps {
  token: string | null;
  isAdmin: boolean;
  userID?: number;
}

export function PromptManagerCard({ token, isAdmin, userID }: PromptManagerCardProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptNotice, setPromptNotice] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createGlobal, setCreateGlobal] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);

  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editGlobal, setEditGlobal] = useState(false);
  const [savingPromptId, setSavingPromptId] = useState<number | null>(null);
  const [deletingPromptId, setDeletingPromptId] = useState<number | null>(null);

  const refreshPrompts = useCallback(async () => {
    if (!token) {
      setPrompts([]);
      setIsLoadingPrompts(false);
      return;
    }
    setIsLoadingPrompts(true);
    setPromptError(null);
    try {
      const loadedPrompts = await fetchPromptsApi(token);
      setPrompts(loadedPrompts);
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : "Prompts laden mislukt");
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshPrompts();
  }, [refreshPrompts]);

  async function handleCreatePrompt(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const title = createTitle.trim();
    const content = createContent.trim();
    if (!title || !content) {
      setPromptError("Titel en prompttekst zijn verplicht");
      return;
    }

    setIsCreatingPrompt(true);
    setPromptError(null);
    setPromptNotice(null);
    try {
      await createPromptApi(token, {
        title,
        content,
        is_global: isAdmin ? createGlobal : false,
      });
      setCreateTitle("");
      setCreateContent("");
      setCreateGlobal(false);
      setPromptNotice("Prompt aangemaakt.");
      await refreshPrompts();
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : "Prompt aanmaken mislukt");
    } finally {
      setIsCreatingPrompt(false);
    }
  }

  function beginEdit(prompt: PromptItem) {
    setEditingPromptId(prompt.id);
    setEditTitle(prompt.title);
    setEditContent(prompt.content);
    setEditGlobal(prompt.is_global);
    setPromptError(null);
    setPromptNotice(null);
  }

  function cancelEdit() {
    setEditingPromptId(null);
    setEditTitle("");
    setEditContent("");
    setEditGlobal(false);
  }

  async function handleSavePrompt(prompt: PromptItem) {
    if (!token) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) {
      setPromptError("Titel en prompttekst zijn verplicht");
      return;
    }

    setSavingPromptId(prompt.id);
    setPromptError(null);
    setPromptNotice(null);
    try {
      await updatePromptApi(token, prompt.id, {
        title,
        content,
        is_global: isAdmin ? editGlobal : prompt.is_global,
      });
      cancelEdit();
      setPromptNotice("Prompt bijgewerkt.");
      await refreshPrompts();
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : "Prompt bijwerken mislukt");
    } finally {
      setSavingPromptId(null);
    }
  }

  async function handleDeletePrompt(prompt: PromptItem) {
    if (!token) return;
    if (!window.confirm("Weet je zeker dat je deze prompt wilt verwijderen?")) {
      return;
    }
    setDeletingPromptId(prompt.id);
    setPromptError(null);
    setPromptNotice(null);
    try {
      await deletePromptApi(token, prompt.id);
      if (editingPromptId === prompt.id) {
        cancelEdit();
      }
      setPromptNotice("Prompt verwijderd.");
      await refreshPrompts();
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : "Prompt verwijderen mislukt");
    } finally {
      setDeletingPromptId(null);
    }
  }

  const globalPrompts = prompts.filter((prompt) => prompt.is_global);
  const ownPrompts = prompts.filter((prompt) => !prompt.is_global && prompt.user_id === userID);

  return (
    <Card className="border-sky-200/70 bg-sky-50/20">
      <CardHeader className="flex-row items-start gap-3">
        <div className="mt-1 flex size-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <Globe className="size-4" />
        </div>
        <div>
          <CardTitle>Promptbeheer</CardTitle>
          <CardDescription>
            Beheer je eigen prompts. Alleen admins kunnen prompts globaal maken.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleCreatePrompt}>
          <div className="space-y-2">
            <Label htmlFor="prompt-title">Titel</Label>
            <Input
              id="prompt-title"
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="Bijv. Vergadernotulen samenvatten"
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt-content">Prompttekst</Label>
            <Textarea
              id="prompt-content"
              rows={5}
              value={createContent}
              onChange={(event) => setCreateContent(event.target.value)}
              placeholder="Schrijf hier de prompt..."
              maxLength={8000}
            />
          </div>
          {isAdmin && (
            <Label className="flex items-center gap-2 text-sm font-normal">
              <input
                type="checkbox"
                checked={createGlobal}
                onChange={(event) => setCreateGlobal(event.target.checked)}
                className="size-4"
              />
              Maak dit een globale prompt
            </Label>
          )}

          {promptError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {promptError}
            </div>
          )}
          {promptNotice && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {promptNotice}
            </div>
          )}

          <Button type="submit" disabled={isCreatingPrompt}>
            {isCreatingPrompt ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Bezig met aanmaken...
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Prompt toevoegen
              </>
            )}
          </Button>
        </form>

        <Separator />

        {isLoadingPrompts ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Prompts laden...
          </div>
        ) : (
          <div className="space-y-6">
            <PromptSection
              title="Globale prompts"
              description="Zichtbaar voor alle gebruikers."
              prompts={globalPrompts}
              editingPromptId={editingPromptId}
              savingPromptId={savingPromptId}
              deletingPromptId={deletingPromptId}
              editTitle={editTitle}
              editContent={editContent}
              editGlobal={editGlobal}
              isAdmin={isAdmin}
              onBeginEdit={beginEdit}
              onSavePrompt={handleSavePrompt}
              onDeletePrompt={handleDeletePrompt}
              onCancelEdit={cancelEdit}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              onEditGlobalChange={setEditGlobal}
              emptyText="Nog geen globale prompts."
            />
            <PromptSection
              title="Mijn prive prompts"
              description="Alleen zichtbaar voor jouw account."
              prompts={ownPrompts}
              editingPromptId={editingPromptId}
              savingPromptId={savingPromptId}
              deletingPromptId={deletingPromptId}
              editTitle={editTitle}
              editContent={editContent}
              editGlobal={editGlobal}
              isAdmin={isAdmin}
              onBeginEdit={beginEdit}
              onSavePrompt={handleSavePrompt}
              onDeletePrompt={handleDeletePrompt}
              onCancelEdit={cancelEdit}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              onEditGlobalChange={setEditGlobal}
              emptyText="Je hebt nog geen prive prompts."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
