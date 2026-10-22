export type FeedTab = "foryou" | "trending" | "following" | "stars";

export interface Repo {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  pushedAt: string;
  url: string;
}

export interface Viewer {
  login: string;
  name: string | null;
  avatar: string;
}

export interface FeedResponse {
  items: Repo[];
  nextPage: number | null;
  followedOwners: string[];
  starredRepos: string[];
}

export interface Profile {
  languageWeights: Record<string, number>;
  following: string[];
}
