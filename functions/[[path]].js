export async function onRequest() {
  return new Response(
    "Cloudflare Pages proxy is deployed. Next step: connect the Dev Tunnel.",
    {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }
  );
}
