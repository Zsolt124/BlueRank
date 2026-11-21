
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Site Temporarily Offline - BlueRank</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(135deg,#32fc8d 0%,#6757f5 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:40px 20px}
.offline-container{background:rgba(255,255,255,.96);border-radius:20px;padding:50px 35px;max-width:600px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)}
h1{font-size:clamp(28px,6vw,40px);margin:20px 0;color:#6757f5}
p{color:#777;font-size:15px;line-height:1.8;margin-bottom:20px}
.offline-icon{font-size:85px}
.btn{padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;border:0}
.btn-primary{background:linear-gradient(135deg,#32c978,#6757f5);color:white}
.btn-secondary{background:white;color:#6757f5;border:2px solid #6757f5}
.info-card{background:#f8f9fa;padding:17px;border-radius:12px;margin:12px 0;text-align:left}
.footer{margin-top:30px;padding-top:22px;border-top:2px solid #f0f0f0}
.footer a{color:#6757f5}
</style>
</head>
<body>
<main class="offline-container">
<div class="offline-icon">🔴</div>
<h1>Site Temporarily Offline</h1>
<p>We're currently not available.</p>
<p>Our website is temporarily offline because the server is unavailable. Please check back shortly.</p>
<div class="info-card"><h3>📋 What Happened?</h3><p>The website's local server may be stopped or temporarily disconnected.</p></div>
<div class="info-card"><h3>⏰ When Will It Be Back?</h3><p>The website should return when the server and connection are running again.</p></div>
<div class="info-card"><h3>💬 Need Help?</h3><p>Contact our support team using the email below.</p></div>
<button class="btn btn-primary" id="retryBtn">🔄 Try Again</button>
<a href="mailto:tjuepos@gmail.com" class="btn btn-secondary">📧 Contact Support</a>
<div class="footer">
<p><strong>Support Contact</strong></p>
<p><a href="mailto:tjuepos@gmail.com">tjuepos@gmail.com</a></p>
<p id="refreshStatus">We'll automatically check again in 30 seconds.</p>
</div>
</main>
<script>
document.getElementById("retryBtn").addEventListener("click",()=>location.reload());
setTimeout(()=>location.reload(),30000);
</script>
</body>
</html>`;

const OFFLINE_STATUSES = new Set([
  502, 503, 504, 520, 521, 522, 523, 524, 530
]);

const PRODUCTION_BACKEND =
  "https://shrill-base-ea73.szalmazsolti8.workers.dev";

const DEVELOPMENT_BACKEND =
  "https://dev-shrill-base-ea73.szalmazsolti8.workers.dev";

function offlineResponse(request) {
  const isApi = new URL(request.url).pathname.startsWith("/api/");

  const headers = {
    "cache-control": "no-store, no-cache, must-revalidate",
    "retry-after": "30"
  };

  if (isApi) {
    headers["content-type"] = "application/json; charset=utf-8";

    return new Response(
      request.method === "HEAD" ? null : JSON.stringify({
        success: false,
        error: "service_unavailable",
        message: "BlueRank is temporarily offline. Please try again later."
      }),
      { status: 503, headers }
    );
  }

  headers["content-type"] = "text/html; charset=utf-8";

  return new Response(
    request.method === "HEAD" ? null : OFFLINE_HTML,
    { status: 503, headers }
  );
}

export async function onRequest(context) {
  const request = context.request;

  try {
    const incoming = new URL(request.url);
    const hostname = incoming.hostname.toLowerCase();

    // Determine which Pages deployment received the request.
    const isDev =
      hostname === "dev.tjuepost.pages.dev" ||
      hostname.startsWith("dev.") ||
      hostname.includes("-dev.");

    // Permit the production hostname and Pages preview hostnames.
    const isProduction = hostname === "tjuepost.pages.dev";

    const isPagesPreview =
      hostname.endsWith(".pages.dev") &&
      hostname !== "tjuepost.pages.dev";

    if (
      incoming.protocol !== "https:" ||
      (!isProduction && !isPagesPreview)
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    // Choose backend.
    const backend = isDev
      ? DEVELOPMENT_BACKEND
      : PRODUCTION_BACKEND;

    const environment = isDev ? "dev" : "production";

    console.log("BlueRank incoming request:", {
      environment,
      hostname,
      path: incoming.pathname,
      method: request.method
    });

    // Require shared proxy secret.
    const proxySecret =
      context.env.PROXY_SECRET_KEY ||
      context.env.BLUERANK_PROXY_SECRET;

    if (!proxySecret || proxySecret.length < 32) {
      console.error("BlueRank proxy secret is missing or invalid.");
      return offlineResponse(request);
    }

    // Construct backend URL.
    const target = new URL(
      incoming.pathname + incoming.search,
      backend
    );

    const upstreamRequest = new Request(target.toString(), request);
    const headers = new Headers(upstreamRequest.headers);

    // Remove untrusted forwarding headers.
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("x-blue-rank-visitor-ip");
    headers.delete("x-bluerank-visitor-ip");
    headers.delete("x-bluerank-proxy-key");
    headers.delete("x-bluerank-environment");

    // Supply visitor IP from Cloudflare.
    const visitorIP = request.headers.get("CF-Connecting-IP");

    if (visitorIP) {
      headers.set("X-BlueRank-Visitor-IP", visitorIP);
    }

    // Authenticate and identify environment.
    headers.set("X-BlueRank-Proxy-Key", proxySecret);
    headers.set("X-BlueRank-Environment", environment);

    // Required by Dev Tunnels.
    headers.set("x-tunnel-skip-anti-phishing-page", "true");

    const finalRequest = new Request(upstreamRequest, {
      headers,
      redirect: "manual"
    });

    const response = await fetch(finalRequest);

    console.log("BlueRank backend response:", {
      environment,
      status: response.status,
      path: incoming.pathname,
      contentType: response.headers.get("content-type")
    });

    if (OFFLINE_STATUSES.has(response.status)) {
      return offlineResponse(request);
    }

    const acceptsHtml = (
      request.headers.get("accept") || ""
    ).includes("text/html");

    if (acceptsHtml && response.ok) {
      const body = await response.clone().text();

      if (!body.trim()) {
        return offlineResponse(request);
      }
    }

    const outHeaders = new Headers(response.headers);

    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");
    outHeaders.delete("x-bluerank-proxy-key");
    outHeaders.delete("x-blue-rank-visitor-ip");

    outHeaders.set("cache-control", "no-store");

    return new Response(
      request.method === "HEAD" ? null : response.body,
      {
        status: response.status,
        statusText: response.statusText,
        headers: outHeaders
      }
    );

  } catch (error) {
    console.error("BlueRank backend connection failed:", error);
    return offlineResponse(request);
  }
}
