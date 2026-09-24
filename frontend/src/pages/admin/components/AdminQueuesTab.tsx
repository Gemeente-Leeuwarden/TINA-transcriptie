import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchQueueMessagesApi, fetchQueuesApi } from "@/pages/admin/api";
import type { RabbitQueueInfo, RabbitQueueMessage } from "@/pages/admin/types";

interface AdminQueuesTabProps {
  token: string | null;
}

export function AdminQueuesTab({ token }: AdminQueuesTabProps) {
  const [queues, setQueues] = useState<RabbitQueueInfo[]>([]);
  const [queuesError, setQueuesError] = useState<string | null>(null);
  const [isLoadingQueues, setIsLoadingQueues] = useState(false);
  const [queueMessages, setQueueMessages] = useState<Record<string, RabbitQueueMessage[]>>({});
  const [queueBusy, setQueueBusy] = useState<Record<string, boolean>>({});
  const [queueMessageError, setQueueMessageError] = useState<Record<string, string | null>>({});
  const [queueViewed, setQueueViewed] = useState<Record<string, boolean>>({});

  const fetchQueues = useCallback(async () => {
    if (!token) return;
    setIsLoadingQueues(true);
    setQueuesError(null);
    try {
      const queueItems = await fetchQueuesApi(token);
      setQueues(queueItems);
    } catch (err) {
      setQueuesError(err instanceof Error ? err.message : "Queues laden mislukt");
    } finally {
      setIsLoadingQueues(false);
    }
  }, [token]);

  const fetchQueueMessages = useCallback(
    async (queueName: string) => {
      if (!token) return;
      setQueueMessageError((prev) => ({ ...prev, [queueName]: null }));
      setQueueBusy((prev) => ({ ...prev, [queueName]: true }));
      setQueueViewed((prev) => ({ ...prev, [queueName]: true }));
      try {
        const messages = await fetchQueueMessagesApi(token, queueName, 10, "peek");
        setQueueMessages((prev) => ({ ...prev, [queueName]: messages }));
      } catch (err) {
        setQueueMessageError((prev) => ({
          ...prev,
          [queueName]: err instanceof Error ? err.message : "Queue items laden mislukt",
        }));
      } finally {
        setQueueBusy((prev) => ({ ...prev, [queueName]: false }));
      }
    },
    [token]
  );

  const dropQueueMessage = useCallback(
    async (queueName: string) => {
      if (!token) return;
      setQueueMessageError((prev) => ({ ...prev, [queueName]: null }));
      setQueueBusy((prev) => ({ ...prev, [queueName]: true }));
      setQueueViewed((prev) => ({ ...prev, [queueName]: true }));
      try {
        await fetchQueueMessagesApi(token, queueName, 1, "drop");
        await fetchQueueMessages(queueName);
      } catch (err) {
        setQueueMessageError((prev) => ({
          ...prev,
          [queueName]: err instanceof Error ? err.message : "Queue item verwijderen mislukt",
        }));
      } finally {
        setQueueBusy((prev) => ({ ...prev, [queueName]: false }));
      }
    },
    [fetchQueueMessages, token]
  );

  useEffect(() => {
    if (!token) return;
    void fetchQueues();
  }, [fetchQueues, token]);

  return (
    <Card className="border-slate-200/70 bg-slate-50/30">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>RabbitMQ queues</CardTitle>
          <CardDescription>Actuele status van de queues.</CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void fetchQueues()}
          disabled={isLoadingQueues}
        >
          {isLoadingQueues ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Vernieuwen
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {queuesError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {queuesError}
          </div>
        )}
        {isLoadingQueues ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Queues laden...
          </div>
        ) : queues.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
            Geen queues gevonden.
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {queues.map((queue) => (
              <div key={queue.name} className="rounded-md border bg-white/70 px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{queue.name}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Messages: {queue.messages}</span>
                      <span>Ready: {queue.messages_ready}</span>
                      <span>Unacked: {queue.messages_unacknowledged}</span>
                      <span>Consumers: {queue.consumers}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (queueViewed[queue.name]) {
                          setQueueViewed((prev) => ({ ...prev, [queue.name]: false }));
                        } else {
                          void fetchQueueMessages(queue.name);
                        }
                      }}
                      disabled={queueBusy[queue.name]}
                    >
                      {queueViewed[queue.name] ? "Verbergen" : "Bekijken"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void dropQueueMessage(queue.name)}
                      disabled={queueBusy[queue.name]}
                    >
                      Verwijder volgende bericht
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Verwijderen haalt alleen het eerstvolgende bericht uit de queue.
                </div>

                {queueMessageError[queue.name] && (
                  <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {queueMessageError[queue.name]}
                  </div>
                )}

                {queueViewed[queue.name] && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Items (peek)
                    </div>
                    {queueMessages[queue.name] && queueMessages[queue.name].length > 0 ? (
                      queueMessages[queue.name].map((message, index) => (
                        <div
                          key={`${queue.name}-${index}`}
                          className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-700"
                        >
                          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                            <span>{message.routing_key || "routing_key"}</span>
                            {message.redelivered ? <span>redelivered</span> : null}
                          </div>
                          <pre className="mt-2 whitespace-pre-wrap text-[11px]">
                            {JSON.stringify(message.payload, null, 2)}
                          </pre>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        Geen items in deze queue.
                        {queue.messages_unacknowledged > 0 && (
                          <div className="mt-2">
                            Er zijn {queue.messages_unacknowledged} in-flight berichten (unacked) die niet te peeken zijn.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
