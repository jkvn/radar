import { NextRequest, NextResponse } from "next/server";
import { cookieNames, tokenCookieOptions } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(cookieNames.state)?.value;
  const home = new URL("/", req.nextUrl.origin);

  if (!code || !state || state !== savedState) {
    home.searchParams.set("error", "auth");
    return NextResponse.redirect(home);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    home.searchParams.set("error", "config");
    return NextResponse.redirect(home);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
    }),
  });

  const data = (await tokenRes.json()) as { access_token?: string };
  if (!data.access_token) {
    home.searchParams.set("error", "token");
    return NextResponse.redirect(home);
  }

  const res = NextResponse.redirect(home);
  res.cookies.set(cookieNames.token, data.access_token, tokenCookieOptions);
  res.cookies.delete(cookieNames.state);
  return res;
}
