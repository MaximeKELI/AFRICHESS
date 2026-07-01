import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";
import type { StatsPdfDocumentProps, StatsPdfLabels } from "./types";
import { COLORS, pdfStyles as s } from "./styles";

function PageChrome({
  labels,
  displayName,
  children,
}: {
  labels: StatsPdfLabels;
  displayName: string;
  children: ReactNode;
}) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.pageHeader} fixed>
        <Text style={s.pageHeaderBrand}>{labels.brand}</Text>
        <Text style={s.pageHeaderUser}>{displayName}</Text>
      </View>
      {children}
      <View style={s.pageFooter} fixed>
        <Text style={s.footerText}>{labels.confidential}</Text>
        <Text
          style={s.footerPage}
          render={({ pageNumber, totalPages }) =>
            `${labels.page} ${pageNumber} ${labels.of} ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionNumber}>§{n}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionRule} />
      {children}
    </View>
  );
}

function KpiCard({
  value,
  label,
  sub,
  accent,
}: {
  value: string | number;
  label: string;
  sub?: string;
  accent?: "green" | "gold";
}) {
  return (
    <View style={s.kpiCard}>
      <Text style={[s.kpiValue, accent === "gold" ? { color: COLORS.gold } : {}]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function OutcomeBars({
  labels,
  won,
  drawn,
  lost,
}: {
  labels: StatsPdfLabels;
  won: number;
  drawn: number;
  lost: number;
}) {
  const total = Math.max(won + drawn + lost, 1);
  const rows = [
    { label: labels.victories, value: won, color: COLORS.greenLight },
    { label: labels.draws, value: drawn, color: COLORS.draw },
    { label: labels.losses, value: lost, color: COLORS.terracotta },
  ];
  return (
    <View>
      {rows.map((row) => (
        <View key={row.label} style={s.outcomeRow}>
          <Text style={s.outcomeLabel}>{row.label}</Text>
          <View style={s.outcomeBarTrack}>
            <View
              style={[
                s.outcomeBarFill,
                { width: `${(row.value / total) * 100}%`, backgroundColor: row.color },
              ]}
            />
          </View>
          <Text style={s.outcomeValue}>
            {row.value} ({Math.round((row.value / total) * 100)}%)
          </Text>
        </View>
      ))}
    </View>
  );
}

function DataTable({
  headers,
  widths,
  rows,
  alignRightFrom = 1,
}: {
  headers: string[];
  widths: string[];
  rows: (string | number)[][];
  alignRightFrom?: number;
}) {
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        {headers.map((h, i) => (
          <Text key={h} style={[s.tableHeaderCell, { width: widths[i] }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[s.tableRow, ri % 2 === 1 ? s.tableRowAlt : {}]}>
          {row.map((cell, ci) => (
            <Text
              key={ci}
              style={[
                ci >= alignRightFrom ? s.tableCellMono : s.tableCell,
                { width: widths[ci] },
                ci >= alignRightFrom ? { textAlign: "right" } : {},
              ]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ActivityChart({ activity }: { activity: { date: string; games: number }[] }) {
  const max = Math.max(...activity.map((a) => a.games), 1);
  return (
    <View style={s.activityChart}>
      {activity.map((a, i) => (
        <View
          key={`${a.date}-${i}`}
          style={[
            s.activityBar,
            {
              height: Math.max(2, (a.games / max) * 56),
              backgroundColor: a.games > 0 ? COLORS.gold : COLORS.creamDark,
              opacity: a.games > 0 ? 0.85 : 0.4,
            },
          ]}
        />
      ))}
    </View>
  );
}

function outcomeText(labels: StatsPdfLabels, outcome: string): string {
  if (outcome === "win") return labels.outcomeWin;
  if (outcome === "loss") return labels.outcomeLoss;
  return labels.outcomeDraw;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function StatsPdfDocument({
  data,
  username,
  displayName,
  labels,
  exportedAt,
  terminationMap,
  locale,
}: StatsPdfDocumentProps) {
  const summary = data.summary as Record<string, number>;
  const wdl = `${summary.games_won ?? 0}V · ${summary.games_drawn ?? 0}N · ${summary.games_lost ?? 0}D`;

  let sectionNum = 0;
  const nextSection = () => {
    sectionNum += 1;
    return sectionNum;
  };

  return (
    <Document
      title={`${labels.brand} — ${displayName}`}
      author={labels.brand}
      subject={labels.coverSubtitle}
    >
      {/* ── Page de garde ── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverCornerTop} />
        <View style={s.coverCornerBottom} />
        <Text style={s.coverBrand}>{labels.brand}</Text>
        <View style={s.coverRule} />
        <Text style={s.coverSubtitle}>{labels.coverSubtitle}</Text>
        <Text style={s.coverPlayer}>{displayName}</Text>
        <Text style={s.coverMeta}>
          @{username} · {labels.generatedAt}
        </Text>
        <Text style={s.coverTagline}>{labels.coverTagline}</Text>
      </Page>

      {/* ── Résumé & performances ── */}
      <PageChrome labels={labels} displayName={displayName}>
        <Section n={nextSection()} title={labels.sectionSummary}>
          <View style={s.kpiRow}>
            <KpiCard value={summary.games_played ?? 0} label={labels.games} />
            <KpiCard
              value={`${summary.win_rate ?? 0}%`}
              label={labels.winRate}
              sub={wdl}
              accent="green"
            />
            <KpiCard
              value={summary.current_streak ?? 0}
              label={labels.streak}
              sub={`${labels.wins}: ${summary.best_win_streak ?? 0}`}
            />
            <KpiCard value={`${summary.total_play_time_hours ?? 0}h`} label={labels.playTime} />
            <KpiCard value={summary.puzzles_solved ?? 0} label={labels.puzzles} />
            <KpiCard
              value={(data.ai_stats as { games_vs_ai?: number })?.games_vs_ai ?? 0}
              label={labels.vsAi}
              accent="gold"
            />
          </View>
        </Section>

        <Section n={nextSection()} title={labels.sectionOutcomes}>
          <OutcomeBars
            labels={labels}
            won={summary.games_won ?? 0}
            drawn={summary.games_drawn ?? 0}
            lost={summary.games_lost ?? 0}
          />
        </Section>

        {data.by_mode.length > 0 && (
          <Section n={nextSection()} title={labels.sectionModes}>
            <DataTable
              headers={[labels.mode, labels.played, labels.won, labels.drawn, labels.lost, labels.winPct]}
              widths={["22%", "14%", "14%", "14%", "14%", "22%"]}
              rows={data.by_mode.map((m) => {
                const row = m as Record<string, unknown>;
                return [
                  String(row.mode ?? ""),
                  row.played ?? 0,
                  row.won ?? 0,
                  row.drawn ?? 0,
                  row.lost ?? 0,
                  `${row.win_rate ?? 0}%`,
                ];
              })}
            />
          </Section>
        )}
      </PageChrome>

      {/* ── Adversaires & couleurs ── */}
      <PageChrome labels={labels} displayName={displayName}>
        <Section n={nextSection()} title={labels.sectionOpponents}>
          <DataTable
            headers={[labels.opponent, labels.played, labels.won, labels.drawn, labels.lost, labels.winPct]}
            widths={["28%", "14%", "14%", "14%", "14%", "16%"]}
            rows={[
              [
                labels.online,
                data.vs_opponent.human.played,
                data.vs_opponent.human.won,
                data.vs_opponent.human.drawn,
                data.vs_opponent.human.lost,
                `${data.vs_opponent.human.win_rate}%`,
              ],
              [
                labels.ai,
                data.vs_opponent.ai.played,
                data.vs_opponent.ai.won,
                data.vs_opponent.ai.drawn,
                data.vs_opponent.ai.lost,
                `${data.vs_opponent.ai.win_rate}%`,
              ],
              [
                labels.white,
                data.by_color.white.played,
                data.by_color.white.won,
                data.by_color.white.drawn,
                data.by_color.white.lost,
                `${data.by_color.white.win_rate}%`,
              ],
              [
                labels.black,
                data.by_color.black.played,
                data.by_color.black.won,
                data.by_color.black.drawn,
                data.by_color.black.lost,
                `${data.by_color.black.win_rate}%`,
              ],
            ]}
          />
        </Section>

        {Object.keys(data.by_termination).length > 0 && (
          <Section n={nextSection()} title={labels.termination}>
            <DataTable
              headers={[labels.termination, labels.played]}
              widths={["70%", "30%"]}
              rows={Object.entries(data.by_termination).map(([k, v]) => [
                terminationMap[k] ?? k,
                v,
              ])}
            />
          </Section>
        )}

        {data.ratings.length > 0 && (
          <Section n={nextSection()} title={labels.sectionRatings}>
            <DataTable
              headers={[labels.mode, labels.elo, labels.peak, labels.games]}
              widths={["25%", "25%", "25%", "25%"]}
              rows={data.ratings.map((r) => {
                const row = r as Record<string, unknown>;
                return [String(row.mode ?? ""), row.elo ?? 0, row.peak_elo ?? 0, row.games_count ?? 0];
              })}
            />
          </Section>
        )}
      </PageChrome>

      {/* ── Historique ELO & parties ── */}
      <PageChrome labels={labels} displayName={displayName}>
        {data.rating_history.length > 0 && (
          <Section n={nextSection()} title={labels.sectionEloHistory}>
            <DataTable
              headers={[labels.date, labels.mode, labels.before, labels.after, labels.change]}
              widths={["24%", "16%", "20%", "20%", "20%"]}
              rows={data.rating_history.slice(0, 18).map((h) => {
                const row = h as Record<string, unknown>;
                const change = row.change as number;
                const sign = change > 0 ? `+${change}` : String(change);
                return [
                  formatDate(String(row.created_at ?? ""), locale),
                  String(row.mode ?? ""),
                  row.elo_before ?? 0,
                  row.elo_after ?? 0,
                  sign,
                ];
              })}
            />
          </Section>
        )}

        {data.recent_form.length > 0 && (
          <Section n={nextSection()} title={labels.sectionRecentGames}>
            <DataTable
              headers={[labels.date, labels.opponent, labels.mode, labels.result, labels.moves]}
              widths={["18%", "32%", "14%", "18%", "18%"]}
              rows={data.recent_form.slice(0, 16).map((g) => {
                const row = g as Record<string, unknown>;
                return [
                  formatDate(String(row.date ?? ""), locale),
                  String(row.opponent ?? "").slice(0, 28),
                  String(row.mode ?? ""),
                  outcomeText(labels, String(row.outcome ?? "")),
                  row.move_count ?? 0,
                ];
              })}
            />
          </Section>
        )}
      </PageChrome>

      {/* ── Ouvertures & activité ── */}
      <PageChrome labels={labels} displayName={displayName}>
        {data.openings.length > 0 && (
          <Section n={nextSection()} title={labels.sectionOpenings}>
            <DataTable
              headers={[labels.opening, labels.played, labels.won, labels.winPct]}
              widths={["50%", "16%", "16%", "18%"]}
              rows={data.openings.slice(0, 12).map((o) => {
                const row = o as Record<string, unknown>;
                return [String(row.name ?? "").slice(0, 40), row.played ?? 0, row.won ?? 0, `${row.win_rate ?? 0}%`];
              })}
            />
          </Section>
        )}

        {data.activity.some((a) => a.games > 0) && (
          <Section n={nextSection()} title={labels.sectionActivity}>
            <ActivityChart activity={data.activity} />
            <View style={{ marginTop: 8 }}>
              <DataTable
                headers={[labels.date, labels.games]}
                widths={["60%", "40%"]}
                rows={data.activity
                  .filter((a) => a.games > 0)
                  .slice(-14)
                  .map((a) => [a.date, a.games])}
              />
            </View>
          </Section>
        )}

        {data.by_mode.length === 0 &&
          data.recent_form.length === 0 &&
          data.ratings.length === 0 && (
            <Text style={s.empty}>{labels.noData}</Text>
          )}
      </PageChrome>
    </Document>
  );
}
