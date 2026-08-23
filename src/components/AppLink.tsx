"use client";

import { forwardRef } from "react";
import NextLink from "next/link";
import type { LinkComponentProps } from "@cloudflare/kumo";

function isRoutedHref(href?: string) {
  if (!href || href.startsWith("#")) return false;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return false;
  return href.startsWith("/");
}

export const AppLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(
  ({ href, ...props }, ref) => {
    if (isRoutedHref(href)) {
      return <NextLink ref={ref} href={href!} {...props} />;
    }
    return <a ref={ref} href={href} {...props} />;
  },
);

AppLink.displayName = "AppLink";
