import { StyleSheet } from "@react-pdf/renderer";

export const COLORS = {
  gold: "#C9A227",
  goldLight: "#E8D5A3",
  green: "#1B5E3B",
  greenLight: "#2D6A4F",
  terracotta: "#B84A2F",
  draw: "#5C6370",
  ink: "#1A1A1A",
  inkMuted: "#4A4A4A",
  cream: "#FAF8F4",
  creamDark: "#F0EBE3",
  night: "#0D1117",
  nightSoft: "#161B22",
  white: "#FFFFFF",
  rule: "#D4C4A8",
};

export const pdfStyles = StyleSheet.create({
  /* ── Cover ── */
  coverPage: {
    backgroundColor: COLORS.night,
    padding: 56,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  coverCornerTop: {
    position: "absolute",
    top: 40,
    left: 40,
    width: 48,
    height: 48,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: COLORS.gold,
  },
  coverCornerBottom: {
    position: "absolute",
    bottom: 40,
    right: 40,
    width: 48,
    height: 48,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: COLORS.gold,
  },
  coverBrand: {
    fontFamily: "Times-Bold",
    fontSize: 42,
    letterSpacing: 6,
    color: COLORS.gold,
    marginBottom: 8,
  },
  coverRule: {
    width: 120,
    height: 2,
    backgroundColor: COLORS.gold,
    marginVertical: 20,
  },
  coverSubtitle: {
    fontFamily: "Times-Italic",
    fontSize: 18,
    color: COLORS.goldLight,
    marginBottom: 28,
  },
  coverPlayer: {
    fontFamily: "Times-Roman",
    fontSize: 22,
    color: COLORS.white,
    marginBottom: 6,
  },
  coverMeta: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  coverTagline: {
    position: "absolute",
    bottom: 72,
    fontFamily: "Times-Italic",
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 320,
  },

  /* ── Content pages ── */
  page: {
    backgroundColor: COLORS.cream,
    paddingTop: 52,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    color: COLORS.ink,
  },
  pageHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: COLORS.nightSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 44,
  },
  pageHeaderBrand: {
    fontFamily: "Times-Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: COLORS.gold,
  },
  pageHeaderUser: {
    fontFamily: "Times-Italic",
    fontSize: 8,
    color: "#9CA3AF",
  },
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.inkMuted,
    fontFamily: "Times-Roman",
  },
  footerPage: {
    fontSize: 7,
    color: COLORS.inkMuted,
    fontFamily: "Times-Italic",
  },

  /* ── Sections (LaTeX § style) ── */
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  sectionNumber: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: COLORS.green,
    width: 22,
  },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: COLORS.ink,
    letterSpacing: 0.3,
  },
  sectionRule: {
    height: 1,
    backgroundColor: COLORS.rule,
    marginBottom: 10,
  },

  /* ── KPI cards ── */
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  kpiCard: {
    width: "31%",
    backgroundColor: COLORS.white,
    borderWidth: 0.5,
    borderColor: COLORS.rule,
    borderTopWidth: 2,
    borderTopColor: COLORS.gold,
    padding: 10,
    minHeight: 52,
  },
  kpiValue: {
    fontFamily: "Times-Bold",
    fontSize: 16,
    color: COLORS.green,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 7.5,
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  kpiSub: {
    fontSize: 7,
    color: COLORS.inkMuted,
    marginTop: 2,
    fontFamily: "Times-Italic",
  },

  /* ── Outcome bars ── */
  outcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  outcomeLabel: {
    width: 72,
    fontSize: 8.5,
  },
  outcomeBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.creamDark,
    borderRadius: 2,
  },
  outcomeBarFill: {
    height: 10,
    borderRadius: 2,
  },
  outcomeValue: {
    width: 48,
    fontSize: 8,
    fontFamily: "Times-Roman",
    textAlign: "right",
  },

  /* ── Tables ── */
  table: {
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: COLORS.rule,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.green,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: "Times-Bold",
    fontSize: 7.5,
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.rule,
  },
  tableRowAlt: {
    backgroundColor: COLORS.creamDark,
  },
  tableCell: {
    fontSize: 8.5,
    fontFamily: "Times-Roman",
  },
  tableCellMono: {
    fontSize: 8.5,
    fontFamily: "Courier",
  },
  tableCellGreen: {
    color: COLORS.greenLight,
  },
  tableCellRed: {
    color: COLORS.terracotta,
  },
  tableCellGold: {
    color: "#8B6914",
    fontFamily: "Times-Bold",
  },

  /* ── Activity chart ── */
  activityChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    gap: 2,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  activityBar: {
    flex: 1,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    minHeight: 2,
  },

  /* ── Two columns ── */
  twoCol: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },

  empty: {
    fontFamily: "Times-Italic",
    fontSize: 9,
    color: COLORS.inkMuted,
    paddingVertical: 12,
    textAlign: "center",
  },
});
