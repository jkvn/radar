"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Viewer } from "@/lib/types";

export function TopBar({ viewer }: { viewer: Viewer }) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
        <div className="flex flex-col leading-none">
          <span className="font-mono text-sm font-medium text-primary">radar</span>
          <span className="mt-1 text-[11px] text-muted-foreground">
            open source, one scroll at a time
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {viewer.login}
          </span>
          <img
            src={viewer.avatar}
            alt={viewer.login}
            width={28}
            height={28}
            className="size-7 rounded-full border border-border"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}
