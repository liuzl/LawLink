import { getSession } from "@/lib/auth/session";
import {
  listSealRequests,
  listSealTypeConfigs,
  getSealStats
} from "@/server/seals/actions";
import { prisma } from "@/lib/prisma";
import { SealsView } from "./_components/seals-view";

export default async function SealsPage({
  searchParams
}: {
  searchParams?: { new?: string; draftDocId?: string; matterId?: string; documentTitle?: string };
}) {
  const session = await getSession();
  if (!session?.user) return null;

  const [mine, toApprove, all, configs, stats, recentMatters] = await Promise.all([
    listSealRequests({ scope: "mine" }),
    listSealRequests({ scope: "approval" }),
    listSealRequests({ scope: "all" }),
    listSealTypeConfigs(),
    getSealStats(),
    prisma.matter.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, internalCode: true, title: true }
    })
  ]);

  // 卷宗联动：?new=1&draftDocId=...&matterId=...&documentTitle=...
  const presetFromQuery = searchParams?.new === "1"
    ? {
        draftDocId: searchParams.draftDocId,
        matterId: searchParams.matterId,
        documentTitle: searchParams.documentTitle
      }
    : null;

  return (
    <SealsView
      mine={mine}
      toApprove={toApprove}
      all={all}
      configs={configs}
      stats={stats}
      matters={recentMatters}
      currentUser={{ id: session.user.id, role: session.user.role }}
      presetFromQuery={presetFromQuery}
    />
  );
}
