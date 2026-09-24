import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSession } from "@/contexts/useSession";
import { isInviteAllowed } from "@/lib/purpose";
import { Button } from "@/components/ui/button";
import { SessionContentCard } from "@/pages/session-detail/components/SessionContentCard";
import { PromptResultsSidebar } from "@/pages/session-detail/components/PromptResultsSidebar";
import { SessionDetailSidebar } from "@/pages/session-detail/components/SessionDetailSidebar";
import { buildTranscriptExportText } from "@/pages/session-detail/utils";
import { useSessionDetailData } from "@/pages/session-detail/hooks/useSessionDetailData";
import { useSessionDetailPrompts } from "@/pages/session-detail/hooks/useSessionDetailPrompts";
import { useSessionDetailViewModel } from "@/pages/session-detail/hooks/useSessionDetailViewModel";

export default function SessionDetailPage() {
  useDocumentTitle("Session");
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionId = Number(id);
  const { removedSessionId, clearRemovedSession } = useSession();

  const [expandedTranscriptKeys, setExpandedTranscriptKeys] = useState<Set<string>>(() => new Set());
  const [selectedTab, setSelectedTab] = useState<"timeline" | "transcript" | null>(null);
  const [activeContent, setActiveContent] = useState<"transcript" | "prompt">("transcript");

  const {
    detail,
    sortedMembers,
    segments,
    isLoading,
    isMembersLoading,
    error,
    membersError,
    inviteEmail,
    inviteRole,
    isInviting,
    removeBusy,
    setInviteEmail,
    setInviteRole,
    getDisplayName,
    renameSpeaker,
    inviteMember,
    removeMember,
  } = useSessionDetailData({ token, sessionId });

  const canManageMembers = detail?.role === "owner" || detail?.role === "editor";
  const canInviteMembers = canManageMembers && isInviteAllowed(detail?.purpose ?? null);
  const canRenameSpeakers = detail?.role === "owner" || detail?.role === "editor";
  const canApplyPrompts = detail?.role === "owner" || detail?.role === "editor";
  const isSessionFinished = detail?.status === "finished";

  const {
    promptResults,
    isPromptResultsLoading,
    promptResultsError,
    deletePromptError,
    promptOptions,
    isPromptOptionsLoading,
    promptOptionsError,
    selectedPromptId,
    isApplyingPrompt,
    applyPromptError,
    applyPromptNotice,
    deletingPromptResultId,
    activePromptResultId,
    activePromptResult,
    promptSelectValue,
    setSelectedPromptId,
    setActivePromptResultId,
    refreshPromptResults,
    applyPrompt,
    deletePromptResult,
  } = useSessionDetailPrompts({
    token,
    sessionId,
    canApplyPrompts: Boolean(canApplyPrompts),
    isSessionFinished: Boolean(isSessionFinished),
  });

  const {
    transcriptChunks,
    speakerColorMap,
    timelineItems,
    hasStructuredLines,
    hasTimeline,
    activeTab,
    activePromptTitle,
    activePromptText,
    hasActivePromptText,
    transcriptLines,
  } = useSessionDetailViewModel({
    detail,
    segments,
    selectedTab,
    activePromptResult,
  });

  useEffect(() => {
    if (removedSessionId == null || !sessionId) return;
    if (removedSessionId !== sessionId) return;
    clearRemovedSession();
    navigate("/session");
  }, [clearRemovedSession, navigate, removedSessionId, sessionId]);

  function handleDownload() {
    if (!detail) return;
    const text = buildTranscriptExportText({
      hasStructuredLines,
      transcriptLines,
      transcription: detail.transcription ?? "",
      getDisplayName,
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sessie-${detail.sessionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (Number.isNaN(sessionId)) {
    return (
      <>
        <p className="text-sm text-destructive">Ongeldig sessie-ID.</p>
        <Button variant="ghost" onClick={() => navigate("/session")}>Terug</Button>
      </>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr] xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_minmax(240px,320px)]">
      <SessionDetailSidebar
        detail={detail}
        sessionId={sessionId}
        isLoading={isLoading}
        error={error}
        hasStructuredLines={hasStructuredLines}
        canManageMembers={canManageMembers}
        canInviteMembers={canInviteMembers}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        isInviting={isInviting}
        membersError={membersError}
        isMembersLoading={isMembersLoading}
        sortedMembers={sortedMembers}
        removeBusy={removeBusy}
        isSessionFinished={Boolean(isSessionFinished)}
        canApplyPrompts={canApplyPrompts}
        selectedPromptId={selectedPromptId}
        promptOptions={promptOptions}
        isPromptOptionsLoading={isPromptOptionsLoading}
        promptOptionsError={promptOptionsError}
        isApplyingPrompt={isApplyingPrompt}
        applyPromptError={applyPromptError}
        applyPromptNotice={applyPromptNotice}
        onDownload={handleDownload}
        onInviteSubmit={inviteMember}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onRemoveMember={removeMember}
        onApplyPromptSubmit={applyPrompt}
        onSelectedPromptChange={setSelectedPromptId}
      />

      <SessionContentCard
        activeContent={activeContent}
        activeTab={activeTab}
        hasTimeline={hasTimeline}
        hasStructuredLines={hasStructuredLines}
        timelineItems={timelineItems}
        transcriptChunks={transcriptChunks}
        transcriptLines={transcriptLines}
        speakerColorMap={speakerColorMap}
        canRenameSpeakers={canRenameSpeakers}
        expandedTranscriptKeys={expandedTranscriptKeys}
        promptResults={promptResults}
        promptSelectValue={promptSelectValue}
        activePromptResult={activePromptResult}
        activePromptTitle={activePromptTitle}
        activePromptText={activePromptText}
        hasActivePromptText={hasActivePromptText}
        isPromptResultsLoading={isPromptResultsLoading}
        promptResultsError={promptResultsError}
        deletePromptError={deletePromptError}
        deletingPromptResultId={deletingPromptResultId}
        purposePromptTitle={detail?.purpose?.promptTitle ?? null}
        canApplyPrompts={canApplyPrompts}
        onSetActiveContent={setActiveContent}
        onSetActiveTab={(value) => setSelectedTab(value)}
        onSelectPromptResult={setActivePromptResultId}
        onRefreshPromptResults={refreshPromptResults}
        onDeletePromptResult={deletePromptResult}
        onToggleExpandedTranscript={(key) =>
          setExpandedTranscriptKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return next;
          })
        }
        getDisplayName={getDisplayName}
        onRenameSpeaker={renameSpeaker}
      />

      <div className="space-y-4">
        <PromptResultsSidebar
          isSessionFinished={Boolean(isSessionFinished)}
          isPromptResultsLoading={isPromptResultsLoading}
          promptResultsError={promptResultsError}
          promptResults={promptResults}
          activePromptResultId={activePromptResultId}
          onRefresh={refreshPromptResults}
          onSelectResult={(resultId) => {
            setActiveContent("prompt");
            setActivePromptResultId(resultId);
          }}
        />
      </div>
    </div>
  );
}
