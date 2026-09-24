import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PurposeForm } from "@/pages/admin/components/PurposeForm";
import { PurposeListItem } from "@/pages/admin/components/PurposeListItem";
import { useAdminPurposes } from "@/pages/admin/hooks/useAdminPurposes";

interface AdminPurposesTabProps {
  token: string | null;
}

export function AdminPurposesTab({ token }: AdminPurposesTabProps) {
  const {
    purposeForm,
    setPurposeForm,
    purposePromptOptions,
    purposePromptError,
    isLoadingPurposePrompts,
    purposeNotice,
    purposeError,
    isCreatingPurpose,
    purposeItems,
    purposeListError,
    isLoadingPurposes,
    editingPurposeId,
    editForm,
    setEditForm,
    savingPurposeId,
    deletingPurposeId,
    refreshPurposeList,
    createPurpose,
    beginEditPurpose,
    cancelEditPurpose,
    updatePurpose,
    deletePurpose,
  } = useAdminPurposes({ token });

  return (
    <Card className="border-emerald-200/70 bg-emerald-50/20">
      <CardHeader>
        <CardTitle>Nieuw doel</CardTitle>
        <CardDescription>
          Koppel een doel aan een prompt en stel beperkingen en retentie in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {purposeNotice && (
          <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            {purposeNotice}
          </div>
        )}
        {purposeError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {purposeError}
          </div>
        )}

        <form className="space-y-4" onSubmit={createPurpose}>
          <PurposeForm
            form={purposeForm}
            onChange={setPurposeForm}
            promptOptions={purposePromptOptions}
            promptError={purposePromptError}
            isLoadingPrompts={isLoadingPurposePrompts}
            idPrefix="create-purpose"
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isCreatingPurpose}>
              {isCreatingPurpose ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Doel aanmaken"
              )}
            </Button>
          </div>
        </form>

        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Doelen overzicht</div>
              <p className="text-xs text-muted-foreground">Huidige doelen in het systeem.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refreshPurposeList()}
              disabled={isLoadingPurposes}
            >
              {isLoadingPurposes ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Vernieuwen
            </Button>
          </div>

          {purposeListError && (
            <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {purposeListError}
            </div>
          )}

          {isLoadingPurposes ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Doelen laden...
            </div>
          ) : purposeItems.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Geen doelen gevonden.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {purposeItems.map((purpose) => (
                <PurposeListItem
                  key={purpose.id}
                  purpose={purpose}
                  isEditing={editingPurposeId === purpose.id}
                  isSaving={savingPurposeId === purpose.id}
                  isDeleting={deletingPurposeId === purpose.id}
                  editForm={editForm}
                  promptOptions={purposePromptOptions}
                  promptError={purposePromptError}
                  isLoadingPrompts={isLoadingPurposePrompts}
                  onEditFormChange={setEditForm}
                  onBeginEdit={beginEditPurpose}
                  onCancelEdit={cancelEditPurpose}
                  onSave={(purposeId) => void updatePurpose(purposeId)}
                  onDelete={(purposeId) => void deletePurpose(purposeId)}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
