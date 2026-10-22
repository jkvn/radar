"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Loader2, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { languageColor } from "@/lib/languages";
import { markSeen } from "@/lib/seen";
import { cn, formatCount, relativeTime } from "@/lib/utils";
import type { Repo } from "@/lib/types";

const DWELL_MS = 400;

export function RepoCard({
  repo,
  initialStarred = false,
  initialFollowing = false,
}: {
  repo: Repo;
  initialStarred?: boolean;
  initialFollowing?: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timer = setTimeout(() => {
            markSeen(repo.id);
            observer.disconnect();
          }, DWELL_MS);
        } else if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [repo.id]);

  return (
    <article
      ref={root}
      className="relative flex min-h-[82dvh] flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <a
            href={`https://github.com/${repo.owner}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5"
          >
            <img
              src={repo.ownerAvatar}
              alt={repo.owner}
              width={32}
              height={32}
              className="size-8 rounded-full border border-border"
            />
            <span className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {repo.owner}
            </span>
          </a>
          <FollowButton login={repo.owner} initialFollowing={initialFollowing} />
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="block font-mono text-lg font-medium tracking-tight transition-colors hover:text-primary"
          >
            {repo.name}
          </a>
          <StarButton repo={repo} initialStarred={initialStarred} />
        </div>

        {repo.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {repo.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: languageColor(repo.language) }}
              />
              {repo.language}
            </span>
          )}
          <span>updated {relativeTime(repo.pushedAt)}</span>
          {repo.topics.slice(0, 3).map((topic) => (
            <Badge key={topic}>{topic}</Badge>
          ))}
        </div>
      </div>

      <div className="relative mt-4 flex-1 overflow-hidden border-t border-border">
        <Readme repo={repo} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/85 to-transparent" />
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background/90 px-4 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:text-primary"
        >
          Read on GitHub
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </article>
  );
}

type ReadmeStatus = "pending" | "loading" | "ready" | "empty" | "error";

function Readme({ repo }: { repo: Repo }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ReadmeStatus>("pending");
  const [doc, setDoc] = useState("");

  useEffect(() => {
    if (status !== "pending") return;
    const node = anchor.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        setStatus("loading");
        fetch(`/api/readme?repo=${repo.fullName}`)
          .then(async (res) => {
            if (res.status === 204) return setStatus("empty");
            if (!res.ok) return setStatus("error");
            const data = (await res.json()) as { html: string };
            setDoc(readmeDocument(data.html, repo.fullName));
            setStatus("ready");
          })
          .catch(() => setStatus("error"));
      },
      { rootMargin: "1600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [repo.fullName, status]);

  return (
    <div ref={anchor} className="absolute inset-0">
      {status === "ready" ? (
        <iframe
          title={`${repo.name} README`}
          srcDoc={doc}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="pointer-events-none h-[1600px] w-full border-0"
        />
      ) : status === "empty" ? (
        <Centered>No README to preview.</Centered>
      ) : status === "error" ? (
        <Centered>Couldn&apos;t load the README.</Centered>
      ) : (
        <div className="space-y-3 p-5">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-44 w-full" />
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function StarButton({ repo, initialStarred }: { repo: Repo; initialStarred: boolean }) {
  const [starred, setStarred] = useState(initialStarred);
  const [stars, setStars] = useState(repo.stars);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !starred;
    setStarred(next);
    setStars((value) => value + (next ? 1 : -1));
    setPending(true);
    const res = await fetch("/api/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: repo.fullName, starred: next }),
    });
    setPending(false);
    if (!res.ok) {
      setStarred(!next);
      setStars((value) => value - (next ? 1 : -1));
    }
  }

  return (
    <Button
      variant={starred ? "secondary" : "outline"}
      size="pill"
      onClick={toggle}
      disabled={pending}
      className={cn(starred && "border-star/40 bg-star/10 text-star hover:bg-star/15")}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Star className={cn(starred && "fill-star")} />
      )}
      {formatCount(stars)}
    </Button>
  );
}

function FollowButton({
  login,
  initialFollowing,
}: {
  login: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !following;
    setFollowing(next);
    setPending(true);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, following: next }),
    });
    setPending(false);
    if (!res.ok) setFollowing(!next);
  }

  return (
    <Button
      variant={following ? "ghost" : "secondary"}
      size="pill"
      onClick={toggle}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : following ? (
        <Check />
      ) : (
        <Plus />
      )}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

const README_STYLE = `
  :root { color-scheme: dark; }
  body {
    margin: 0;
    padding: 20px;
    background: #1b1d25;
    color: #e6e7ec;
    font: 15px/1.65 ui-sans-serif, system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }
  a { color: #a4adff; text-decoration: none; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  h1, h2, h3, h4 { line-height: 1.25; margin: 1.3em 0 .5em; font-weight: 600; }
  h1 { font-size: 1.55em; }
  h2 { font-size: 1.28em; border-bottom: 1px solid #2b2d38; padding-bottom: .3em; }
  h3 { font-size: 1.1em; }
  p { margin: 0 0 1em; }
  ul, ol { padding-left: 1.4em; }
  code { font-family: ui-monospace, "SF Mono", monospace; font-size: .86em; background: #11131a; padding: .15em .4em; border-radius: 5px; }
  pre { background: #11131a; padding: 14px 16px; border-radius: 10px; overflow: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 0 0 1em; padding-left: 14px; border-left: 3px solid #2b2d38; color: #a9acb8; }
  table { border-collapse: collapse; display: block; overflow: auto; }
  th, td { border: 1px solid #2b2d38; padding: 6px 12px; }
  hr { border: 0; border-top: 1px solid #2b2d38; margin: 1.6em 0; }
  ::-webkit-scrollbar { display: none; }
`;

function readmeDocument(body: string, fullName: string) {
  const base = `https://github.com/${fullName}/`;
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${base}" target="_blank"><style>${README_STYLE}</style></head><body>${body}</body></html>`;
}
