/** Export des statistiques en CSV ou JSON. */

export interface StatsExportData {
  summary: Record<string, unknown>;
  by_mode: Record<string, unknown>[];
  vs_opponent: Record<string, unknown>;
  by_color: Record<string, unknown>;
  by_termination: Record<string, number>;
  openings: Record<string, unknown>[];
  recent_form: Record<string, unknown>[];
  ratings: Record<string, unknown>[];
  rating_history: Record<string, unknown>[];
  activity: Record<string, unknown>[];
  analysis: Record<string, unknown>;
  ai_stats: Record<string, unknown>;
}

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}

export function buildStatsCsv(data: StatsExportData, username: string): string {
  const sections: string[] = [];
  const exportedAt = new Date().toISOString();

  sections.push(`# AFRICHESS — Statistiques de ${username}`);
  sections.push(`# Exporté le ${exportedAt}`);
  sections.push("");

  sections.push("## RÉSUMÉ");
  sections.push(
    rowsToCsv(
      ["indicateur", "valeur"],
      Object.entries(data.summary).map(([k, v]) => [k, v])
    )
  );
  sections.push("");

  if (data.by_mode.length) {
    sections.push("## PAR CADENCE");
    const keys = Object.keys(data.by_mode[0]);
    sections.push(
      rowsToCsv(
        keys,
        data.by_mode.map((r) => keys.map((k) => r[k]))
      )
    );
    sections.push("");
  }

  const bucketRow = (b: Record<string, unknown>) => [
    b.played,
    b.won,
    b.drawn,
    b.lost,
    b.win_rate,
  ];

  sections.push("## ADVERSAIRE");
  sections.push(
    rowsToCsv(
      ["type", "jouées", "victoires", "nulles", "défaites", "win_rate"],
      [
        ["humain", ...bucketRow(data.vs_opponent.human as Record<string, unknown>)],
        ["ia", ...bucketRow(data.vs_opponent.ai as Record<string, unknown>)],
      ]
    )
  );
  sections.push("");

  sections.push("## COULEUR");
  sections.push(
    rowsToCsv(
      ["couleur", "jouées", "victoires", "nulles", "défaites", "win_rate"],
      [
        ["blancs", ...bucketRow(data.by_color.white as Record<string, unknown>)],
        ["noirs", ...bucketRow(data.by_color.black as Record<string, unknown>)],
      ]
    )
  );
  sections.push("");

  if (Object.keys(data.by_termination).length) {
    sections.push("## FINS DE PARTIE");
    sections.push(
      rowsToCsv(
        ["type", "nombre"],
        Object.entries(data.by_termination).map(([k, v]) => [k, v])
      )
    );
    sections.push("");
  }

  if (data.openings.length) {
    sections.push("## OUVERTURES");
    const keys = Object.keys(data.openings[0]);
    sections.push(
      rowsToCsv(
        keys,
        data.openings.map((r) => keys.map((k) => r[k]))
      )
    );
    sections.push("");
  }

  if (data.ratings.length) {
    sections.push("## CLASSEMENTS ELO");
    const keys = Object.keys(data.ratings[0]);
    sections.push(
      rowsToCsv(
        keys,
        data.ratings.map((r) => keys.map((k) => r[k]))
      )
    );
    sections.push("");
  }

  if (data.rating_history.length) {
    sections.push("## HISTORIQUE ELO");
    const keys = Object.keys(data.rating_history[0]);
    sections.push(
      rowsToCsv(
        keys,
        data.rating_history.map((r) => keys.map((k) => r[k]))
      )
    );
    sections.push("");
  }

  if (data.recent_form.length) {
    sections.push("## PARTIES RÉCENTES");
    const keys = Object.keys(data.recent_form[0]);
    sections.push(
      rowsToCsv(
        keys,
        data.recent_form.map((r) => keys.map((k) => r[k]))
      )
    );
    sections.push("");
  }

  if (data.activity.length) {
    sections.push("## ACTIVITÉ (30 JOURS)");
    sections.push(
      rowsToCsv(
        ["date", "parties"],
        data.activity.map((a) => [a.date, a.games])
      )
    );
  }

  return sections.join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadStatsJson(data: StatsExportData, username: string) {
  const payload = {
    exported_at: new Date().toISOString(),
    username,
    ...data,
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    `africhess-stats-${username}-${Date.now()}.json`,
    "application/json"
  );
}

export function downloadStatsCsv(data: StatsExportData, username: string) {
  downloadFile(
    buildStatsCsv(data, username),
    `africhess-stats-${username}-${Date.now()}.csv`,
    "text/csv;charset=utf-8"
  );
}
