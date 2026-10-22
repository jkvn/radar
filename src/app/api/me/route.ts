import { NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { getViewer } from "@/lib/github";

export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ viewer: null }, { status: 401 });
  }
  try {
    const viewer = await getViewer(token);
    return NextResponse.json({ viewer });
  } catch {
    return NextResponse.json({ viewer: null }, { status: 401 });
  }
}
