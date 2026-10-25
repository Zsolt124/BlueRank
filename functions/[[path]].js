export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  const target = new URL(
    incoming.pathname + incoming.search,
    "https://44x180gd-5000.euw.devtunnels.ms"
  );

  const headers = new Headers(context.request.headers);
  headers.set("host", target.host);
  headers.set("x-tunnel-skip-anti-phishing-page", "true");

  const request = new Request(target, context.request);
  const response = await fetch(
    new Request(request, { headers, redirect: "manual" })
  );

  const outHeaders = new Headers(response.headers);
  outHeaders.delete("content-encoding");
  outHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
}
