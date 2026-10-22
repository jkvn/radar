import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { GithubError, setStar } from "@/lib/github";

export async function POST(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { fullName, starred } = (await req.json()) as {
    fullName?: string;
    starred?: boolean;
  };
  if (!fullName || !/^[\w.-]+\/[\w.-]+$/.test(fullName) || typeof starred !== "boolean") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    await setStar(token, fullName, starred);
    return NextResponse.json({ starred });
  } catch (error) {
    const status = error instanceof GithubError ? error.status : 502;
    return NextResponse.json({ error: "star_failed" }, { status });
  }
}
