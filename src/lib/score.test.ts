import { describe, expect, it } from "vitest";
import { buildProfile, rankRepos, scoreRepo } from "@/lib/score";
import type { Repo } from "@/lib/types";

const now = new Date("2026-10-22T00:00:00Z").getTime();

function repo(partial: Partial<Repo> & { id: number }): Repo {
  return {
    fullName: `owner/${partial.id}`,
    name: String(partial.id),
    owner: "owner",
    ownerAvatar: "",
    description: null,
    language: null,
    stars: 0,
    topics: [],
    pushedAt: "2026-10-21T00:00:00Z",
    url: "",
    ...partial,
  };
}

describe("buildProfile", () => {
  it("normalizes language weights to the most-starred language", () => {
    const profile = buildProfile(["TypeScript", "TypeScript", "Go"], []);
    expect(profile.languageWeights.TypeScript).toBe(1);
    expect(profile.languageWeights.Go).toBeCloseTo(0.5);
  });
});

describe("scoreRepo", () => {
  it("ranks a followed author's repo above an unrelated one", () => {
    const profile = buildProfile(["Rust"], ["torvalds"]);
    const followed = scoreRepo(repo({ id: 1, owner: "torvalds" }), profile, now);
    const stranger = scoreRepo(repo({ id: 2, owner: "stranger" }), profile, now);
    expect(followed).toBeGreaterThan(stranger);
  });

  it("rewards a language the user stars", () => {
    const profile = buildProfile(["Rust", "Rust"], []);
    const match = scoreRepo(repo({ id: 1, language: "Rust" }), profile, now);
    const other = scoreRepo(repo({ id: 2, language: "COBOL" }), profile, now);
    expect(match).toBeGreaterThan(other);
  });

  it("decays stale repositories", () => {
    const profile = buildProfile([], []);
    const fresh = scoreRepo(repo({ id: 1, pushedAt: "2026-10-21T00:00:00Z" }), profile, now);
    const stale = scoreRepo(repo({ id: 2, pushedAt: "2024-01-01T00:00:00Z" }), profile, now);
    expect(fresh).toBeGreaterThan(stale);
  });
});

describe("rankRepos", () => {
  it("drops duplicates by id and keeps the highest scorer first", () => {
    const profile = buildProfile(["Rust"], ["torvalds"]);
    const ranked = rankRepos(
      [
        repo({ id: 1, owner: "stranger", stars: 10 }),
        repo({ id: 2, owner: "torvalds", stars: 10 }),
        repo({ id: 2, owner: "torvalds", stars: 10 }),
      ],
      profile,
      now,
    );
    expect(ranked).toHaveLength(2);
    expect(ranked[0].owner).toBe("torvalds");
  });
});
