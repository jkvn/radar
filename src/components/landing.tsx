import { Github, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const preview = [
  { repo: "oven-sh/bun", stars: "76.2k" },
  { repo: "withastro/astro", stars: "48.9k" },
  { repo: "swnck/2verto", stars: "12.4k" },
  { repo: "zed-industries/zed", stars: "61.0k" },
];

export function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-16">
      <div className="grid items-center gap-16 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-mono text-sm text-primary">RADAR</p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
            Scroll open source like a feed.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Radar watches what you star and who you follow, then surfaces repositories
            worth your attention — one at a time, endlessly. Star and follow without
            leaving the scroll.
          </p>
          <a
            href="/api/auth/login"
            className={cn(buttonVariants({ size: "lg" }), "mt-8")}
          >
            <Github />
            Continue with GitHub
          </a>
        </div>

        <div
          aria-hidden
          className="relative hidden h-72 md:block [mask-image:linear-gradient(to_bottom,black,transparent)]"
        >
          <div className="space-y-3">
            {preview.map((item, index) => (
              <div
                key={item.repo}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
                style={{ opacity: 1 - index * 0.18 }}
              >
                <span className="font-mono text-sm text-foreground">{item.repo}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="size-3.5" />
                  {item.stars}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
