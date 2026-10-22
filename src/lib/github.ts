import type { Repo, Viewer } from "@/lib/types";

const API = "https://api.github.com";

export class GithubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
    cache: "no-store",
  });
  return res;
}

async function json<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await request(token, path, init);
  if (!res.ok) {
    throw new GithubError(res.status, `GitHub ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

interface RawRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
  pushed_at: string;
  html_url: string;
}

function mapRepo(raw: RawRepo): Repo {
  return {
    id: raw.id,
    fullName: raw.full_name,
    name: raw.name,
    owner: raw.owner.login,
    ownerAvatar: raw.owner.avatar_url,
    description: raw.description,
    language: raw.language,
    stars: raw.stargazers_count,
    topics: raw.topics ?? [],
    pushedAt: raw.pushed_at,
    url: raw.html_url,
  };
}

export async function getViewer(token: string): Promise<Viewer> {
  const raw = await json<{ login: string; name: string | null; avatar_url: string }>(
    token,
    "/user",
  );
  return { login: raw.login, name: raw.name, avatar: raw.avatar_url };
}

export async function searchRepos(
  token: string,
  query: string,
  page: number,
  perPage: number,
): Promise<Repo[]> {
  const params = new URLSearchParams({
    q: query,
    sort: "stars",
    order: "desc",
    per_page: String(perPage),
    page: String(page),
  });
  const data = await json<{ items: RawRepo[] }>(token, `/search/repositories?${params}`);
  return data.items.map(mapRepo);
}

export async function searchReposRecent(
  token: string,
  query: string,
  page: number,
  perPage: number,
): Promise<Repo[]> {
  const params = new URLSearchParams({
    q: query,
    sort: "updated",
    order: "desc",
    per_page: String(perPage),
    page: String(page),
  });
  const data = await json<{ items: RawRepo[] }>(token, `/search/repositories?${params}`);
  return data.items.map(mapRepo);
}

export async function getStarred(
  token: string,
  page: number,
  perPage: number,
): Promise<Repo[]> {
  const data = await json<RawRepo[]>(
    token,
    `/user/starred?per_page=${perPage}&page=${page}`,
  );
  return data.map(mapRepo);
}

export async function getFollowing(token: string, limit: number): Promise<string[]> {
  const data = await json<{ login: string }[]>(
    token,
    `/user/following?per_page=${Math.min(limit, 100)}`,
  );
  return data.map((u) => u.login);
}

export async function getTopStarredLanguages(token: string): Promise<string[]> {
  const data = await json<RawRepo[]>(token, "/user/starred?per_page=100");
  return data.map((r) => r.language).filter((l): l is string => Boolean(l));
}

export async function getReadmeHtml(token: string, fullName: string): Promise<string | null> {
  const res = await request(token, `/repos/${fullName}/readme`, {
    headers: { Accept: "application/vnd.github.html" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new GithubError(res.status, `readme ${fullName}`);
  return res.text();
}

export async function isFollowing(token: string, login: string): Promise<boolean> {
  const res = await request(token, `/user/following/${login}`);
  return res.status === 204;
}

export async function getFollowedAmong(token: string, logins: string[]): Promise<string[]> {
  const unique = [...new Set(logins)];
  const results = await Promise.all(
    unique.map(async (login) => ((await isFollowing(token, login)) ? login : null)),
  );
  return results.filter((login): login is string => login !== null);
}

export async function isStarred(token: string, fullName: string): Promise<boolean> {
  const res = await request(token, `/user/starred/${fullName}`);
  return res.status === 204;
}

export async function getStarredAmong(token: string, fullNames: string[]): Promise<string[]> {
  const results = await Promise.all(
    fullNames.map(async (name) => ((await isStarred(token, name)) ? name : null)),
  );
  return results.filter((name): name is string => name !== null);
}

export async function setStar(token: string, fullName: string, starred: boolean) {
  const res = await request(token, `/user/starred/${fullName}`, {
    method: starred ? "PUT" : "DELETE",
    headers: { "Content-Length": "0" },
  });
  if (!res.ok && res.status !== 204) {
    throw new GithubError(res.status, `star ${fullName}`);
  }
}

export async function setFollow(token: string, login: string, following: boolean) {
  const res = await request(token, `/user/following/${login}`, {
    method: following ? "PUT" : "DELETE",
    headers: { "Content-Length": "0" },
  });
  if (!res.ok && res.status !== 204) {
    throw new GithubError(res.status, `follow ${login}`);
  }
}
