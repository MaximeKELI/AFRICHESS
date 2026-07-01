"use client";

import type { StatsExportData } from "@/lib/statsExport";
import { downloadFile } from "@/lib/statsExport";
import { terminationLabel } from "@/lib/i18n/labels";
import { buildStatsPdfLabels } from "./buildLabels";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export async function downloadStatsPdf(
  data: StatsExportData,
  username: string,
  displayName: string,
  t: TranslateFn,
  locale: string
): Promise<void> {
  const [{ pdf }, { StatsPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./StatsPdfDocument"),
  ]);

  const labels = buildStatsPdfLabels(t, locale);
  const terminationMap = Object.fromEntries(
    Object.keys(data.by_termination).map((k) => [k, terminationLabel(t, k)])
  );

  const blob = await pdf(
    <StatsPdfDocument
      data={data}
      username={username}
      displayName={displayName}
      labels={labels}
      exportedAt={new Date()}
      terminationMap={terminationMap}
      locale={locale}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `africhess-stats-${username}-${Date.now()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
