import { getToken } from "@/lib/session";
import { getViewer } from "@/lib/github";
import { Landing } from "@/components/landing";
import { TopBar } from "@/components/top-bar";
import { Feed } from "@/components/feed";
import type { Viewer } from "@/lib/types";

export default async function Home() {
  const token = await getToken();
  let viewer: Viewer | null = null;

  if (token) {
    try {
      viewer = await getViewer(token);
    } catch {
      viewer = null;
    }
  }

  if (!viewer) {
    return <Landing />;
  }

  return (
    <>
      <TopBar viewer={viewer} />
      <Feed />
    </>
  );
}
