"use server";

import { requireSession } from "@/lib/auth/session";
import {
  searchPtalCases as clientSearch,
  buildCaseDetailUrl,
  type PtalSearchParams,
  type PtalCase,
  YuandianNotConfiguredError
} from "@/lib/yuandian/client";
import { getYuandianSettings } from "@/lib/yuandian/settings";
import { audit } from "@/server/audit";

export type CaseSearchHit = Omit<PtalCase, "url"> & {
  detailUrl: string;
};

export async function searchSimilarCases(
  params: PtalSearchParams & { matterId?: string }
): Promise<{ total: number; items: CaseSearchHit[]; pointsCharged: number }> {
  const session = await requireSession();

  const settings = await getYuandianSettings();
  if (!settings.configured) throw new YuandianNotConfiguredError();

  const { matterId, ...searchParams } = params;
  const res = await clientSearch(searchParams, settings);

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_CASE_SEARCH",
    targetType: matterId ? "Matter" : "SystemSetting",
    targetId: matterId ?? "yuandianSettings",
    detail: {
      ay: searchParams.ay,
      qw: searchParams.qw,
      xzqh_p: searchParams.xzqh_p,
      top_k: searchParams.top_k,
      total: res.total,
      hits: res.items.length
    }
  });

  return {
    total: res.total,
    items: res.items.map((c) => {
      const { url, ...rest } = c;
      return { ...rest, detailUrl: buildCaseDetailUrl(settings.caseDetailHost, url) };
    }),
    pointsCharged: 10
  };
}
