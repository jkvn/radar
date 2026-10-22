import { NextResponse } from "next/server";
import { cookieNames } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(cookieNames.token);
  return res;
}
