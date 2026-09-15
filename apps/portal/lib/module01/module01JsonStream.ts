// JSON permits leading whitespace. Heartbeats keep idle proxies active without
// changing the response.json() contract or exposing partial report content.
export function streamModule01Json(
  run: (signal: AbortSignal) => Promise<Response>,
  requestSignal?: AbortSignal,
  heartbeatMs = 5000,
) {
  const abort = new AbortController();
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const cancel = () => { abort.abort(); clearInterval(timer); };
  requestSignal?.addEventListener("abort", cancel, { once: true });
  if (requestSignal?.aborted) cancel();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode("\n"));
      timer = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(" \n")); }, heartbeatMs);
      try {
        const response = await run(abort.signal);
        const json = await response.text();
        if (!closed) controller.enqueue(encoder.encode(json));
      } catch {
        if (!closed) controller.enqueue(encoder.encode(JSON.stringify({ status: "error", message: "Report generation failed." })));
      } finally {
        clearInterval(timer);
        requestSignal?.removeEventListener("abort", cancel);
        if (!closed) { closed = true; controller.close(); }
      }
    },
    cancel() { closed = true; cancel(); },
  });
  return new Response(body, { headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-cache, no-store, no-transform",
    "x-accel-buffering": "no",
  } });
}
