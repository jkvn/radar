import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import {
  GithubError,
  getFollowedAmong,
  getFollowing,
  getStarred,
  getStarredAmong,
  getTopStarredLanguages,
  searchRepos,
  searchReposRecent,
} from "@/lib/github";
import { buildProfile, rankRepos } from "@/lib/score";
import type { FeedResponse, FeedTab, Repo } from "@/lib/types";

const PER_PAGE = 20;
const MAX_PAGE = 50;
const MAX_FOLLOWING_IN_QUERY = 12;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function nextPage(page: number, received: number): number | null {
  if (received < PER_PAGE || page >= MAX_PAGE) return null;
  return page + 1;
}

function followingQuery(logins: string[]) {
  return logins
    .slice(0, MAX_FOLLOWING_IN_QUERY)
    .map((login) => `user:${login}`)
    .join(" ");
}

async function trending(token: string, page: number): Promise<Repo[]> {
  return searchRepos(token, `stars:>50 pushed:>${daysAgo(14)}`, page, PER_PAGE);
}

async function following(token: string, page: number): Promise<Repo[]> {
  const logins = await getFollowing(token, 100);
  if (logins.length === 0) return [];
  return searchReposRecent(token, followingQuery(logins), page, PER_PAGE);
}

async function forYou(token: string, page: number): Promise<Repo[]> {
  const [languages, follows] = await Promise.all([
    getTopStarredLanguages(token),
    getFollowing(token, 100),
  ]);
  const profile = buildProfile(languages, follows);

  const topLanguages = Object.entries(profile.languageWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([language]) => `language:"${language}"`);

  const query =
    topLanguages.length > 0
      ? `${topLanguages.join(" ")} stars:>20 pushed:>${daysAgo(60)}`
      : `stars:>100 pushed:>${daysAgo(14)}`;

  const candidates = await searchRepos(token, query, page, PER_PAGE);

  if (page === 1 && follows.length > 0) {
    const fromFollowing = await searchReposRecent(
      token,
      followingQuery(follows),
      1,
      PER_PAGE,
    );
    return rankRepos([...fromFollowing, ...candidates], profile).slice(0, PER_PAGE);
  }

  return rankRepos(candidates, profile);
}

export async function GET(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const tab = (req.nextUrl.searchParams.get("tab") ?? "foryou") as FeedTab;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));

  try {
    const items =
      tab === "trending"
        ? await trending(token, page)
        : tab === "following"
          ? await following(token, page)
          : tab === "stars"
            ? await getStarred(token, page, PER_PAGE)
            : await forYou(token, page);

    const [followedOwners, starredRepos] = await Promise.all([
      getFollowedAmong(
        token,
        items.map((repo) => repo.owner),
      ),
      tab === "stars"
        ? Promise.resolve(items.map((repo) => repo.fullName))
        : getStarredAmong(
            token,
            items.map((repo) => repo.fullName),
          ),
    ]);

    const body: FeedResponse = {
      items,
      nextPage: nextPage(page, items.length),
      followedOwners,
      starredRepos,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof GithubError) {
      if (error.status === 401) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }
      if (error.status === 403) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
    }
    return NextResponse.json({ error: "feed_failed" }, { status: 502 });
  }
}
