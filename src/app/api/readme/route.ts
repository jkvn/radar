import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { GithubError, getReadmeHtml } from "@/lib/github";

export async function GET(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const repo = req.nextUrl.searchParams.get("repo");
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const html = await getReadmeHtml(token, repo);
    if (html === null) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json({ html });
  } catch (error) {
    const status = error instanceof GithubError ? error.status : 502;
    return NextResponse.json({ error: "readme_failed" }, { status });
  }
}
