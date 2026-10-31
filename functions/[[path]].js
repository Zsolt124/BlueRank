
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Site Temporarily Offline - BlueRank</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
background:linear-gradient(135deg,#32fc8d 0%,#6757f5 100%);
min-height:100vh;display:flex;justify-content:center;align-items:center;
padding:40px 20px;position:relative;overflow-x:hidden
}
body::before{
content:'';position:fixed;inset:0;
background-image:radial-gradient(circle at 20% 50%,rgba(255,255,255,.1) 0%,transparent 50%),
radial-gradient(circle at 80% 80%,rgba(255,255,255,.1) 0%,transparent 50%);
animation:pulse 8s ease-in-out infinite;pointer-events:none
}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.offline-container{
background:rgba(255,255,255,.96);border-radius:20px;
padding:50px 35px;max-width:600px;width:100%;text-align:center;
box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative;z-index:1;
animation:slideIn .6s ease
}
@keyframes slideIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.offline-icon{font-size:85px;display:inline-block;animation:bounce 2s ease-in-out infinite}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
h1{
font-size:clamp(28px,6vw,40px);margin:20px 0;
background:linear-gradient(135deg,#32c978,#6757f5);
-webkit-background-clip:text;-webkit-text-fill-color:transparent
}
.subtitle{color:#666;font-size:19px;margin-bottom:25px;font-weight:500}
p{color:#777;font-size:15px;line-height:1.8;margin-bottom:20px}
.status-badge{
display:inline-block;background:linear-gradient(135deg,#32c978,#6757f5);
color:white;padding:11px 25px;border-radius:50px;font-weight:600;margin:10px 0 25px
}
.info-grid{display:grid;grid-template-columns:1fr;gap:12px;margin:25px 0}
.info-card{background:#f8f9fa;padding:17px;border-radius:12px;border-left:4px solid #6757f5;text-align:left}
.info-card h3{color:#333;font-size:15px;margin-bottom:7px}
.info-card p{color:#666;font-size:14px;margin:0}
.action-buttons{display:flex;gap:12px;justify-content:center;margin-top:25px;flex-wrap:wrap}
.btn{padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;border:0}
.btn-primary{background:linear-gradient(135deg,#32c978,#6757f5);color:white}
.btn-secondary{background:white;color:#6757f5;border:2px solid #6757f5}
.btn:hover{transform:translateY(-2px)}
.footer{margin-top:30px;padding-top:22px;border-top:2px solid #f0f0f0}
.footer p{font-size:13px;color:#999;margin:5px 0}
.footer a{color:#6757f5;text-decoration:none;font-weight:600}
@media(max-width:600px){
.offline-container{padding:35px 22px}
.offline-icon{font-size:70px}
.action-buttons{flex-direction:column}
.btn{width:100%}
}
</style>
</head>
<body>
<main class="offline-container">
<div class="offline-icon" aria-hidden="true">🔴</div>
<h1>Site Temporarily Offline</h1>
<p class="subtitle">We're currently not available</p>
<div class="status-badge">⚠️ Service Unavailable</div>
<p>Our website is temporarily offline because the server is unavailable.
Your data has not necessarily been lost. Please check back shortly.</p>
<div class="info-grid">
<div class="info-card">
<h3>📋 What Happened?</h3>
<p>The website's local server may be stopped or temporarily disconnected.</p>
</div>
<div class="info-card">
<h3>⏰ When Will It Be Back?</h3>
<p>The website should return when the server and connection are running again.</p>
</div>
<div class="info-card">
<h3>💬 Need Help?</h3>
<p>For urgent inquiries, contact our support team using the email below.</p>
</div>
</div>
<div class="action-buttons">
<button class="btn btn-primary" id="retryBtn">🔄 Try Again</button>
<a href="mailto:tjuepos@gmail.com" class="btn btn-secondary">📧 Contact Support</a>
</div>
<div class="footer">
<p><strong>Support Contact</strong></p>
<p>Email: <a href="mailto:tjuepos@gmail.com">tjuepos@gmail.com</a></p>
<p style="margin-top:18px;color:#aaa">Thank you for your patience.</p>
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

const BACKEND_ORIGIN =
  "https://44x180gd-5000.euw.devtunnels.ms";

function offlineResponse(request) {
  const isApi = new URL(request.url).pathname.startsWith("/api/");

  const headers = {
    "cache-control": "no-store, no-cache, must-revalidate",
    "retry-after": "30"
  };

  if (isApi) {
    headers["content-type"] = "application/json; charset=utf-8";

    return new Response(
      request.method === "HEAD"
        ? null
        : JSON.stringify({
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

    // Only accept requests intended for this Pages deployment.
    if (
      incoming.protocol !== "https:" ||
      incoming.hostname !== "tjuepost.pages.dev"
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    // Require the server-side proxy secret.
    const proxySecret = context.env.PROXY_SECRET_KEY || context.env.BLUERANK_PROXY_SECRET;

    if (!proxySecret || proxySecret.length < 32) {
      console.error("BlueRank proxy secret is missing or invalid.");
      return offlineResponse(request);
    }

    // Construct the backend URL.
    const target = new URL(
      incoming.pathname + incoming.search,
      BACKEND_ORIGIN
    );

    // Preserve the incoming request method, body and headers.
    const upstreamRequest = new Request(target.toString(), request);
    const headers = new Headers(upstreamRequest.headers);

    // Remove untrusted forwarding headers.
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("x-blue-rank-visitor-ip");
    headers.delete("x-bluerank-visitor-ip");
    headers.delete("x-bluerank-proxy-key");

    // Supply the visitor IP from Cloudflare.
    const visitorIP = request.headers.get("CF-Connecting-IP");

    if (visitorIP) {
      headers.set("X-BlueRank-Visitor-IP", visitorIP);
    }

    // Authenticate this proxy request to FastAPI.
    headers.set("X-BlueRank-Proxy-Key", proxySecret);

    // Required by the Dev Tunnel.
    headers.set(
      "x-tunnel-skip-anti-phishing-page",
      "true"
    );

    const finalRequest = new Request(upstreamRequest, {
      headers,
      redirect: "manual"
    });

    const response = await fetch(finalRequest);

    // Handle backend availability errors.
    if (OFFLINE_STATUSES.has(response.status)) {
      return offlineResponse(request);
    }

    // Detect an empty response for browser page requests.
    const acceptsHtml = (
      request.headers.get("accept") || ""
    ).includes("text/html");

    if (acceptsHtml && response.ok) {
      const body = await response.clone().text();

      if (!body.trim()) {
        return offlineResponse(request);
      }
    }

    // Forward response headers safely.
    const outHeaders = new Headers(response.headers);

    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");

    outHeaders.set("cache-control", "no-store");

    // Do not expose internal proxy headers.
    outHeaders.delete("x-bluerank-proxy-key");
    outHeaders.delete("x-blue-rank-visitor-ip");

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
