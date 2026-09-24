import { Centrifuge, Subscription } from "centrifuge/build/protobuf";

let client: Centrifuge | null = null;
const isDev = import.meta.env.DEV;

function logWs(...args: unknown[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log("[ws]", ...args);
  }
}

function logWsChannel(channel: string, payload: unknown) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`[ws:${channel}]`, payload);
  }
}

function normalizeWsUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let withScheme = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(withScheme)) {
    withScheme = `ws://${withScheme.replace(/^\/\//, "")}`;
  }

  if (withScheme.startsWith("http://")) withScheme = withScheme.replace("http://", "ws://");
  if (withScheme.startsWith("https://")) withScheme = withScheme.replace("https://", "wss://");

  try {
    const url = new URL(withScheme);
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/ws";
    }
    return url.toString();
  } catch {
    return withScheme;
  }
}

export function getCentrifuge(token: string): Centrifuge {
  if (client) return client;

  const envWsUrl = import.meta.env.VITE_WS_URL as string | undefined;
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  let wsUrl = normalizeWsUrl(envWsUrl);
  if (!wsUrl) {
    const api = apiUrl || window.location.origin;
    const isSecure = api.startsWith("https");
    const host = api.replace(/^https?:\/\//, "");
    wsUrl = `${isSecure ? "wss" : "ws"}://${host}/ws`;
  }

  client = new Centrifuge(wsUrl, {
    token,
    getToken: () => Promise.resolve(token),
  });

  client.on("connecting", (ctx) => logWs("connecting", ctx));
  client.on("connected", (ctx) => logWs("connected", ctx));
  client.on("disconnected", (ctx) => logWs("disconnected", ctx));
  client.on("error", (ctx) => logWs("error", ctx));
  client.on("message", (ctx) => logWs("message", ctx));
  client.on("publication", (ctx) => {
    let msg: unknown = ctx.data;
    if (ctx.data instanceof Uint8Array) {
      msg = JSON.parse(new TextDecoder().decode(ctx.data));
    }
    logWsChannel(ctx.channel, msg);
  });

  return client;
}

export function disconnectCentrifuge() {
  if (!client) return;
  const current = client;
  client = null;
  try {
    current.disconnect();
  } catch {
    // Ignore disconnect errors when transport isn't initialized yet.
  }
}

export async function rpc<T = unknown>(
  method: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  if (!client) throw new Error("Niet verbonden");
  const encoder = new TextEncoder();
  const result = await client.rpc(method, encoder.encode(JSON.stringify(data)));
  logWs("rpc:response", { method, data: result.data });
  let payload: unknown;
  if (result.data instanceof Uint8Array) {
    const decoder = new TextDecoder();
    payload = JSON.parse(decoder.decode(result.data));
  } else {
    payload = result.data;
  }
  if (
    payload &&
    typeof payload === "object" &&
    (payload as { type?: string }).type === "error"
  ) {
    const message =
      (payload as { message?: string }).message ?? "Onbekende fout";
    throw new Error(message);
  }
  return payload as T;
}

export function subscribeToSession(
  sessionId: number,
  onPublication: (data: Record<string, unknown>) => void
): Subscription {
  if (!client) throw new Error("Niet verbonden");
  const channel = `session:${sessionId}`;
  let sub = client.getSubscription(channel);
  if (!sub) {
    sub = client.newSubscription(channel);
  }
  sub.on("publication", (ctx) => {
    let msg: Record<string, unknown>;
    if (ctx.data instanceof Uint8Array) {
      msg = JSON.parse(new TextDecoder().decode(ctx.data));
    } else {
      msg = ctx.data as Record<string, unknown>;
    }
    logWsChannel(channel, msg);
    onPublication(msg);
  });
  sub.on("subscribing", (ctx) => logWs("subscribing", { channel, ctx }));
  sub.on("subscribed", (ctx) => logWs("subscribed", { channel, ctx }));
  sub.on("unsubscribed", (ctx) => logWs("unsubscribed", { channel, ctx }));
  sub.on("error", (ctx) => logWs("subscription:error", { channel, ctx }));
  sub.subscribe();
  return sub;
}

export function unsubscribeFromSession(sessionId: number): void {
  if (!client) return;
  const channel = `session:${sessionId}`;
  const sub = client.getSubscription(channel);
  if (sub) {
    sub.unsubscribe();
    client.removeSubscription(sub);
  }
}
