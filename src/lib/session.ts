import { cookies } from "next/headers";

const TOKEN_COOKIE = "gh_token";
const STATE_COOKIE = "gh_oauth_state";

export async function getToken() {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export const cookieNames = {
  token: TOKEN_COOKIE,
  state: STATE_COOKIE,
};

export const tokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
