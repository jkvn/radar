"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Loader2, Sparkles, Star, Users } from "lucide-react";
import { RepoCard } from "@/components/repo-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSeen } from "@/lib/seen";
import { cn } from "@/lib/utils";
import type { FeedResponse, FeedTab, Repo } from "@/lib/types";

const TABS: { id: FeedTab; label: string; icon: typeof Flame }[] = [
  { id: "foryou", label: "For You", icon: Sparkles },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "following", label: "Following", icon: Users },
  { id: "stars", label: "My Stars", icon: Star },
];

type Status = "idle" | "loading" | "error" | "rate";

export function Feed() {
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [items, setItems] = useState<Repo[]>([]);
  const [page, setPage] = useState<number | null>(1);
  const [status, setStatus] = useState<Status>("loading");
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());

  const seen = useRef<Set<number>>(new Set());
  const tabRef = useRef(tab);
  const sentinel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (currentTab: FeedTab, pageToLoad: number, replace: boolean) => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/feed?tab=${currentTab}&page=${pageToLoad}`);
      if (tabRef.current !== currentTab) return;
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      if (res.status === 429) {
        setStatus("rate");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = (await res.json()) as FeedResponse;
      if (tabRef.current !== currentTab) return;
      const viewed = currentTab === "stars" ? new Set<number>() : getSeen();
      const fresh = data.items.filter(
        (repo) => !seen.current.has(repo.id) && !viewed.has(repo.id),
      );
      fresh.forEach((repo) => seen.current.add(repo.id));
      setItems((prev) => (replace ? fresh : [...prev, ...fresh]));
      setFollowed((prev) => {
        const next = replace ? new Set<string>() : new Set(prev);
        data.followedOwners.forEach((owner) => next.add(owner));
        return next;
      });
      setStarred((prev) => {
        const next = replace ? new Set<string>() : new Set(prev);
        data.starredRepos.forEach((name) => next.add(name));
        return next;
      });
      setPage(data.nextPage);
      setStatus("idle");
      if (fresh.length === 0 && data.nextPage) {
        void fetchPage(currentTab, data.nextPage, replace);
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    tabRef.current = tab;
    seen.current = new Set();
    setItems([]);
    setPage(1);
    scroller.current?.scrollTo({ top: 0 });
    void fetchPage(tab, 1, true);
  }, [tab, fetchPage]);

  const stateRef = useRef({ page, status, tab });
  stateRef.current = { page, status, tab };

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        const { page: nextToLoad, status: current, tab: activeTab } = stateRef.current;
        if (nextToLoad && current === "idle") {
          void fetchPage(activeTab, nextToLoad, false);
        }
      },
      { rootMargin: "900px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage]);

  const initialLoading = status === "loading" && items.length === 0;
  const empty = status === "idle" && items.length === 0;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <nav className="flex shrink-0 justify-start gap-1 overflow-x-auto border-b border-border px-4 py-2.5 sm:justify-center [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <div ref={scroller} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
          {items.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              initialStarred={starred.has(repo.fullName)}
              initialFollowing={followed.has(repo.owner)}
            />
          ))}

          {initialLoading && <FeedSkeletons />}

          {empty && (
            <Card className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {tab === "following"
                  ? "Follow a few developers and their new work shows up here."
                  : tab === "stars"
                    ? "Repositories you star land here. Go star something."
                    : "Nothing to show yet. Try another tab."}
              </p>
            </Card>
          )}

          {status === "rate" && (
            <Message text="GitHub's rate limit is catching its breath. Give it a minute, then load more." />
          )}

          {status === "error" && (
            <Retry onRetry={() => page && fetchPage(tab, page, false)} />
          )}

          <div ref={sentinel} className="h-px" />

          {status === "loading" && items.length > 0 && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedSkeletons() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="min-h-[82dvh] space-y-4 p-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </Card>
      ))}
    </>
  );
}

function Message({ text }: { text: string }) {
  return (
    <Card className="px-5 py-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}

function Retry({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-5 py-8 text-center">
      <p className="text-sm text-muted-foreground">That request didn&apos;t go through.</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}
