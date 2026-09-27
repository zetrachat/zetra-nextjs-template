import { Zetra, ZetraError } from "@zetra/sdk";

// Secure proxy: the browser talks to this route, this route talks to Zetra with the
// secret key. Works with private agents, and keeps your key off the client.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: Request) {
  const agentId = process.env.ZETRA_AGENT_ID;
  if (!process.env.ZETRA_API_KEY || !agentId) {
    return Response.json(
      { error: { code: "not_configured", message: "Set ZETRA_API_KEY and ZETRA_AGENT_ID in .env.local" } },
      { status: 500 },
    );
  }

  let body: { message?: unknown; conversationId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "invalid_request", message: "Body must be JSON" } }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: { code: "invalid_request", message: `message must be 1–${MAX_MESSAGE_LENGTH} characters` } },
      { status: 400 },
    );
  }

  const zetra = new Zetra(); // reads ZETRA_API_KEY / ZETRA_BASE_URL from the environment
  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const evt of zetra.chatStream(agentId, { message, conversationId, signal: req.signal })) {
          const { type, ...data } = evt;
          controller.enqueue(sse(type, data));
        }
      } catch (err) {
        if (!req.signal.aborted) {
          const e = err instanceof ZetraError ? err : new ZetraError("Upstream error", 502, "upstream_error");
          console.error("[zetra]", e.status, e.code, e.message);
          // Don't leak upstream details (e.g. auth problems) to visitors.
          controller.enqueue(sse("error", { code: e.status === 404 ? "not_found" : "upstream_error", message: "The assistant is unavailable right now." }));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
