import { type ChangeEvent, type FormEvent, useState } from "react";
import { rpc } from "@/lib/centrifuge";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isInviteAllowed } from "@/lib/purpose";
import {
  createUploadSessionApi,
  fetchSessionMembersApi,
  finishUploadSessionApi,
  removeSessionMemberApi,
} from "@/pages/session-upload/api";
import { SessionMembersCard } from "@/pages/session-upload/components/SessionMembersCard";
import { SessionSetupCard } from "@/pages/session-upload/components/SessionSetupCard";
import { UploadFilesCard } from "@/pages/session-upload/components/UploadFilesCard";
import { useSessionMembersData } from "@/pages/session-upload/hooks/useSessionMembersData";
import { useUploadPurposes } from "@/pages/session-upload/hooks/useUploadPurposes";
import type { UploadItem } from "@/pages/session-upload/types";

export default function SessionUpload() {
  useDocumentTitle("Upload");
  const { token } = useAuth();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { purposes, purposeError, purposeLoading } = useUploadPurposes(token);
  const [selectedPurposeId, setSelectedPurposeId] = useState<number | null>(null);
  const [sessionPurpose, setSessionPurpose] = useState<(typeof purposes)[number] | null>(null);

  const {
    members,
    sortedMembers,
    membersError,
    isMembersLoading,
    setMembers,
    setMembersError,
  } = useSessionMembersData(token, sessionId);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [removeBusy, setRemoveBusy] = useState<number | null>(null);

  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPurpose = purposes.find((purpose) => purpose.id === selectedPurposeId) ?? null;
  const inviteAllowed = isInviteAllowed(sessionPurpose);

  async function handleCreateSession() {
    if (!token) return;
    if (!selectedPurposeId) {
      setError("Selecteer eerst een doel.");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const created = await createUploadSessionApi(token, selectedPurposeId);
      setSessionId(created.sessionId);
      setInviteCode(created.inviteCode);
      setStatus(created.status);
      setSessionPurpose(created.sessionPurpose ?? selectedPurpose);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sessie aanmaken mislukt");
    } finally {
      setIsCreating(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) return;
    const items = nextFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploadItems((prev) => [...prev, ...items]);
    event.target.value = "";
  }

  async function uploadSingle(item: UploadItem) {
    if (!token || !sessionId) return;
    return new Promise<void>((resolve) => {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("session_id", String(sessionId));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${import.meta.env.VITE_API_URL}/api/v1/sessions/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadItems((prev) => prev.map((upload) => (upload.id === item.id ? { ...upload, progress } : upload)));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadItems((prev) =>
            prev.map((upload) =>
              upload.id === item.id ? { ...upload, status: "queued", progress: 100 } : upload
            )
          );
          resolve();
          return;
        }

        let message = "Uploaden mislukt";
        try {
          const body = JSON.parse(xhr.responseText);
          message = body?.error ?? message;
        } catch {
          // ignore parse errors
        }
        setUploadItems((prev) =>
          prev.map((upload) =>
            upload.id === item.id ? { ...upload, status: "error", error: message } : upload
          )
        );
        resolve();
      };
      xhr.onerror = () => {
        setUploadItems((prev) =>
          prev.map((upload) =>
            upload.id === item.id ? { ...upload, status: "error", error: "Uploaden mislukt" } : upload
          )
        );
        resolve();
      };
      setUploadItems((prev) =>
        prev.map((upload) => (upload.id === item.id ? { ...upload, status: "uploading" } : upload))
      );
      xhr.send(formData);
    });
  }

  async function handleUpload() {
    if (!sessionId || isUploading || uploadItems.length === 0 || status === "transcribing") return;
    setIsUploading(true);
    setError(null);
    for (const item of uploadItems) {
      if (item.status === "queued") continue;
      await uploadSingle(item);
    }
    setIsUploading(false);
  }

  async function handleFinishSession() {
    if (!token || !sessionId || isFinishing) return;
    setIsFinishing(true);
    setError(null);
    try {
      const nextStatus = await finishUploadSessionApi(token, sessionId);
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sessie afronden mislukt");
    } finally {
      setIsFinishing(false);
    }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim() || !sessionId) return;
    setIsInviting(true);
    setMembersError(null);
    try {
      await rpc("session_invite", {
        email: inviteEmail.trim(),
        role: inviteRole,
        session_id: sessionId,
      });
      setInviteEmail("");
      if (token) {
        const loadedMembers = await fetchSessionMembersApi(token, sessionId);
        setMembers(loadedMembers);
      }
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Uitnodigen mislukt");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemove(userId: number) {
    if (!token || !sessionId) return;
    setRemoveBusy(userId);
    setMembersError(null);
    try {
      await removeSessionMemberApi(token, sessionId, userId);
      setMembers((prev) => prev.filter((member) => member.userId !== userId));
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Deelnemer verwijderen mislukt");
    } finally {
      setRemoveBusy(null);
    }
  }

  return (
    <>
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <SessionSetupCard
        sessionId={sessionId}
        inviteCode={inviteCode}
        status={status}
        purposes={purposes}
        selectedPurposeId={selectedPurposeId}
        selectedPurpose={selectedPurpose}
        purposeLoading={purposeLoading}
        purposeError={purposeError}
        isCreating={isCreating}
        sessionPurpose={sessionPurpose}
        onPurposeChange={setSelectedPurposeId}
        onCreateSession={handleCreateSession}
      />

      <UploadFilesCard
        sessionId={sessionId}
        status={status}
        uploadItems={uploadItems}
        isUploading={isUploading}
        isFinishing={isFinishing}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        onFinishSession={handleFinishSession}
      />

      <SessionMembersCard
        sessionId={sessionId}
        inviteAllowed={inviteAllowed}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        isInviting={isInviting}
        membersError={membersError}
        isMembersLoading={isMembersLoading}
        members={members}
        sortedMembers={sortedMembers}
        removeBusy={removeBusy}
        onInviteSubmit={handleInvite}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onRemoveMember={handleRemove}
      />
    </>
  );
}
