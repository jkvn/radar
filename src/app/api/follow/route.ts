import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { GithubError, setFollow } from "@/lib/github";

export async function POST(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { login, following } = (await req.json()) as {
    login?: string;
    following?: boolean;
  };
  if (!login || !/^[\w-]+$/.test(login) || typeof following !== "boolean") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    await setFollow(token, login, following);
    return NextResponse.json({ following });
  } catch (error) {
    const status = error instanceof GithubError ? error.status : 502;
    return NextResponse.json({ error: "follow_failed" }, { status });
  }
}
