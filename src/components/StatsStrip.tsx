"use client";

import { LayerCard, Text } from "@cloudflare/kumo";
import type { Stats } from "@/lib/types";

export function StatsStrip({ stats }: { stats: Stats }) {
  const items = [
    { label: "冊", value: stats.total },
    { label: "積読", value: stats.unread },
    { label: "読書中", value: stats.reading },
    { label: "読了", value: stats.finished },
    { label: "未読ページ", value: stats.unreadPages },
    { label: "最長積読日", value: stats.oldestUnreadDays },
  ];

  return (
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <LayerCard key={item.label} className="px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-kumo-strong">{item.value}</p>
          <div className="mt-1">
            <Text variant="secondary" size="xs">
              {item.label}
            </Text>
          </div>
        </LayerCard>
      ))}
    </section>
  );
}
