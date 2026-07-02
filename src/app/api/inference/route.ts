import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { url, method, headers, body } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "Target URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[API Proxy] Forwarding request to: ${url}`);

    const modalRes = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!modalRes.ok) {
      const errorText = await modalRes.text();
      console.error(`[API Proxy] Modal API error: ${modalRes.status} - ${errorText}`);
      return new Response(
        JSON.stringify({
          error: `Modal API returned status ${modalRes.status}`,
          details: errorText,
        }),
        {
          status: modalRes.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response if it has a body
    if (modalRes.body) {
      const reader = modalRes.body.getReader();
      const contentType = modalRes.headers.get("content-type") || "text/event-stream";

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }
              controller.enqueue(value);
            }
          } catch (e) {
            controller.error(e);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Default JSON fallback
    const json = await modalRes.json();
    return new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in inference proxy:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
