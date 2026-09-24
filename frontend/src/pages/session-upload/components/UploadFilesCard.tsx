import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UploadItem } from "@/pages/session-upload/types";

interface UploadFilesCardProps {
  sessionId: number | null;
  status: string | null;
  uploadItems: UploadItem[];
  isUploading: boolean;
  isFinishing: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onFinishSession: () => void;
}

export function UploadFilesCard({
  sessionId,
  status,
  uploadItems,
  isUploading,
  isFinishing,
  onFileChange,
  onUpload,
  onFinishSession,
}: UploadFilesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bestanden uploaden</CardTitle>
        <CardDescription>Upload een of meerdere audiobestanden.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept="audio/*"
          multiple
          onChange={onFileChange}
          disabled={!sessionId || isUploading || status === "transcribing"}
        />
        {uploadItems.length > 0 && (
          <div className="space-y-2">
            {uploadItems.map((item) => (
              <div key={item.id} className="rounded-md border px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{item.file.name}</span>
                  <span className="text-muted-foreground">
                    {item.status === "pending" && "Klaar"}
                    {item.status === "uploading" && `${item.progress}%`}
                    {item.status === "queued" && "In wachtrij"}
                    {item.status === "error" && "Fout"}
                  </span>
                </div>
                {item.status === "uploading" && (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
                    <div
                      className="h-full bg-foreground transition-[width]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.error && <div className="mt-2 text-destructive">{item.error}</div>}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onUpload}
            disabled={!sessionId || isUploading || uploadItems.length === 0 || status === "transcribing"}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploaden...
              </>
            ) : (
              "Uploaden en in wachtrij zetten"
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={onFinishSession}
            disabled={!sessionId || isFinishing || status === "transcribing"}
          >
            {isFinishing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sessie afronden...
              </>
            ) : (
              "Sessie afronden"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
