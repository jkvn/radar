import type { Profile, Repo } from "@/lib/types";

export function buildProfile(languages: string[], following: string[]): Profile {
  const counts: Record<string, number> = {};
  for (const language of languages) {
    counts[language] = (counts[language] ?? 0) + 1;
  }
  const max = Math.max(1, ...Object.values(counts));
  const languageWeights: Record<string, number> = {};
  for (const [language, count] of Object.entries(counts)) {
    languageWeights[language] = count / max;
  }
  return { languageWeights, following };
}

const WEIGHTS = {
  follow: 4,
  language: 3,
  freshness: 2,
  popularity: 0.6,
};

export function scoreRepo(repo: Repo, profile: Profile, now = Date.now()): number {
  const popularity = Math.log10(repo.stars + 1);
  const ageDays = (now - new Date(repo.pushedAt).getTime()) / 86_400_000;
  const freshness = Math.exp(-Math.max(0, ageDays) / 45);
  const language = repo.language ? (profile.languageWeights[repo.language] ?? 0) : 0;
  const follow = profile.following.includes(repo.owner) ? 1 : 0;

  return (
    follow * WEIGHTS.follow +
    language * WEIGHTS.language +
    freshness * WEIGHTS.freshness +
    popularity * WEIGHTS.popularity
  );
}

export function rankRepos(repos: Repo[], profile: Profile, now = Date.now()): Repo[] {
  const seen = new Set<number>();
  const unique = repos.filter((repo) => {
    if (seen.has(repo.id)) return false;
    seen.add(repo.id);
    return true;
  });
  return unique
    .map((repo) => ({ repo, score: scoreRepo(repo, profile, now) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.repo);
}
