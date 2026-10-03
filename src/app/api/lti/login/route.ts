import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const iss = searchParams.get("iss");
  const loginHint = searchParams.get("login_hint");
  const targetLinkUri = searchParams.get("target_link_uri") ?? "/workspace";

  if (!iss || !loginHint) {
    return NextResponse.json(
      { error: "Missing required LTI 1.3 OIDC parameters: iss, login_hint" },
      { status: 400 }
    );
  }

  // Construct standard OIDC Auth Request URL redirect to LMS
  const authUrl = new URL(iss + "/api/lti/authorize_redirect");
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("client_id", process.env.LTI_CLIENT_ID ?? "workworld_lti_client");
  authUrl.searchParams.set("redirect_uri", `${new URL(request.url).origin}/api/lti/launch`);
  authUrl.searchParams.set("login_hint", loginHint);
  authUrl.searchParams.set("state", `state_${Date.now()}`);
  authUrl.searchParams.set("prompt", "none");
  authUrl.searchParams.set("response_mode", "form_post");

  return NextResponse.json({
    status: "redirect_ready",
    redirectUrl: authUrl.toString(),
    targetLinkUri,
  });
}
