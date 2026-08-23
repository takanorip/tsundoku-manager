"use client";

import { useEffect } from "react";
import { Banner, LinkButton } from "@cloudflare/kumo";
import { BASE_PATH } from "@/lib/paths";

export default function NotFoundPage() {
  useEffect(() => {
    const path = window.location.pathname.replace(new RegExp(`^${BASE_PATH}`), "");
    const match = path.match(/^\/books\/([^/]+)\/?$/);
    if (match?.[1]) {
      window.location.replace(`${BASE_PATH}/books/?id=${encodeURIComponent(match[1])}`);
    }
  }, []);

  return (
    <div className="space-y-4">
      <Banner variant="error" title="ページが見つかりません" />
      <LinkButton href="/" variant="primary">
        本棚に戻る
      </LinkButton>
    </div>
  );
}
