"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Search,
  Settings2,
  MousePointerClick,
  Radio,
  CalendarClock,
  Ban,
  CheckSquare,
  Square,
  ImagePlus,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  adminApi,
  type AdCarouselSettings,
  type AdSlideAdmin,
  type AdsSummary,
} from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import {
  AdminBadge,
  AdminEmpty,
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

type FilterKey = "all" | "live" | "scheduled" | "expired" | "inactive";

type FormState = {
  title: string;
  alt_text: string;
  link_url: string;
  open_in_new_tab: boolean;
  sponsor_label: string;
  notes: string;
  is_active: boolean;
  order: number;
  duration_ms: string;
  starts_at: string;
  ends_at: string;
  clear_schedule: boolean;
  image: File | null;
};

const emptyForm = (): FormState => ({
  title: "",
  alt_text: "",
  link_url: "",
  open_in_new_tab: true,
  sponsor_label: "",
  notes: "",
  is_active: true,
  order: 0,
  duration_ms: "",
  starts_at: "",
  ends_at: "",
  clear_schedule: false,
  image: null,
});

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildFormData(form: FormState, includeImage: boolean): FormData {
  const fd = new FormData();
  fd.append("title", form.title.trim());
  fd.append("alt_text", form.alt_text.trim());
  fd.append("link_url", form.link_url.trim());
  fd.append("open_in_new_tab", form.open_in_new_tab ? "true" : "false");
  fd.append("sponsor_label", form.sponsor_label.trim());
  fd.append("notes", form.notes.trim());
  fd.append("is_active", form.is_active ? "true" : "false");
  fd.append("order", String(form.order));
  if (form.duration_ms.trim()) fd.append("duration_ms", form.duration_ms.trim());
  if (form.clear_schedule) {
    fd.append("clear_schedule", "true");
  } else {
    if (form.starts_at) fd.append("starts_at", new Date(form.starts_at).toISOString());
    if (form.ends_at) fd.append("ends_at", new Date(form.ends_at).toISOString());
  }
  if (includeImage && form.image) fd.append("image", form.image);
  return fd;
}

function statusTone(status: AdSlideAdmin["schedule_status"]): "ok" | "warn" | "danger" | "neutral" | "info" {
  switch (status) {
    case "live":
      return "ok";
    case "scheduled":
      return "info";
    case "expired":
      return "warn";
    default:
      return "neutral";
  }
}

export default function AdminAdsPage() {
  const { t } = useTranslation();
  const [slides, setSlides] = useState<AdSlideAdmin[]>([]);
  const [summary, setSummary] = useState<AdsSummary | null>(null);
  const [settings, setSettings] = useState<AdCarouselSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.adsList(), adminApi.adsSummary(), adminApi.adsSettings()])
      .then(([listRes, sumRes, setRes]) => {
        setSlides(Array.isArray(listRes.data) ? listRes.data : []);
        setSummary(sumRes.data);
        setSettings(setRes.data);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slides.filter((s) => {
      if (filter === "live" && s.schedule_status !== "live") return false;
      if (filter === "scheduled" && s.schedule_status !== "scheduled") return false;
      if (filter === "expired" && s.schedule_status !== "expired") return false;
      if (filter === "inactive" && s.schedule_status !== "inactive") return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.link_url.toLowerCase().includes(q) ||
        s.sponsor_label.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q)
      );
    });
  }, [slides, filter, query]);

  const flash = (msg: string) => {
    setSuccess(msg);
    window.setTimeout(() => setSuccess(null), 2800);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), order: slides.length });
    setShowForm(true);
    setShowSettings(false);
  };

  const startEdit = (slide: AdSlideAdmin) => {
    setEditingId(slide.id);
    setForm({
      title: slide.title,
      alt_text: slide.alt_text || "",
      link_url: slide.link_url || "",
      open_in_new_tab: slide.open_in_new_tab !== false,
      sponsor_label: slide.sponsor_label || "",
      notes: slide.notes || "",
      is_active: slide.is_active,
      order: slide.order,
      duration_ms: slide.duration_ms != null ? String(slide.duration_ms) : "",
      starts_at: toLocalInput(slide.starts_at),
      ends_at: toLocalInput(slide.ends_at),
      clear_schedule: false,
      image: null,
    });
    setPreviewUrl(slide.image_url);
    setShowForm(true);
    setShowSettings(false);
  };

  const setImageFile = (file: File | null) => {
    if (!file) {
      setForm((f) => ({ ...f, image: null }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("admin.ads.imageTooLarge"));
      return;
    }
    setForm((f) => ({ ...f, image: file }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!editingId && !form.image) {
      setError(t("admin.ads.imageRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await adminApi.adsUpdate(editingId, buildFormData(form, Boolean(form.image)));
        flash(t("admin.ads.saved"));
      } else {
        await adminApi.adsCreate(buildFormData(form, true));
        flash(t("admin.ads.created"));
      }
      setShowForm(false);
      setForm(emptyForm());
      setEditingId(null);
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (slide: AdSlideAdmin) => {
    const fd = new FormData();
    fd.append("is_active", slide.is_active ? "false" : "true");
    try {
      await adminApi.adsUpdate(slide.id, fd);
      flash(slide.is_active ? t("admin.ads.deactivated") : t("admin.ads.activated"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(t("admin.ads.confirmDelete"))) return;
    try {
      await adminApi.adsDelete(id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      flash(t("admin.ads.deleted"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
    }
  };

  const duplicate = async (id: number) => {
    try {
      await adminApi.adsDuplicate(id);
      flash(t("admin.ads.duplicated"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= slides.length) return;
    const ordered = [...slides];
    const [item] = ordered.splice(index, 1);
    ordered.splice(next, 0, item);
    setSlides(ordered);
    try {
      await adminApi.adsReorder(ordered.map((s) => s.id));
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
      load();
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (filtered.every((s) => selected.has(s.id)) && filtered.length > 0) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const runBulk = async (action: "activate" | "deactivate" | "delete") => {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete" && !window.confirm(t("admin.ads.confirmBulkDelete", { count: ids.length }))) {
      return;
    }
    try {
      await adminApi.adsBulk(action, ids);
      setSelected(new Set());
      flash(t("admin.ads.bulkDone"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const { data } = await adminApi.adsSettingsUpdate({
        enabled: settings.enabled,
        default_duration_ms: settings.default_duration_ms,
        pause_on_hover: settings.pause_on_hover,
        show_dots: settings.show_dots,
        show_arrows: settings.show_arrows,
        max_height_px: settings.max_height_px,
      });
      setSettings(data);
      flash(t("admin.ads.settingsSaved"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: t("admin.ads.filter.all"), count: summary?.total },
    { key: "live", label: t("admin.ads.filter.live"), count: summary?.live },
    { key: "scheduled", label: t("admin.ads.filter.scheduled"), count: summary?.scheduled },
    { key: "expired", label: t("admin.ads.filter.expired"), count: summary?.expired },
    { key: "inactive", label: t("admin.ads.filter.inactive"), count: summary?.inactive },
  ];

  const editingSlide = editingId ? slides.find((s) => s.id === editingId) : null;
  const formPreview = previewUrl || editingSlide?.image_url || null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.ads.title")}
        description={t("admin.ads.subtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSettings((v) => !v);
                setShowForm(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-sm font-medium"
            >
              <Settings2 size={16} />
              {t("admin.ads.settings")}
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl african-gradient text-white text-sm font-medium"
            >
              <Plus size={16} />
              {t("admin.ads.add")}
            </button>
          </div>
        }
      />

      {error && <InlineAlert variant="error">{error}</InlineAlert>}
      {success && <InlineAlert variant="info">{success}</InlineAlert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminKpi label={t("admin.ads.kpi.live")} value={summary?.live ?? "—"} icon={Radio} tone="ok" />
        <AdminKpi
          label={t("admin.ads.kpi.scheduled")}
          value={summary?.scheduled ?? "—"}
          icon={CalendarClock}
          tone="warn"
        />
        <AdminKpi
          label={t("admin.ads.kpi.clicks")}
          value={summary?.clicks ?? "—"}
          icon={MousePointerClick}
        />
        <AdminKpi
          label={t("admin.ads.kpi.impressions")}
          value={summary?.impressions ?? "—"}
          icon={Eye}
          tone={summary?.carousel_enabled === false ? "danger" : "default"}
          sub={
            summary?.carousel_enabled === false
              ? t("admin.ads.carouselOff")
              : t("admin.ads.carouselOn")
          }
        />
      </div>

      {showSettings && settings && (
        <AdminPanel title={t("admin.ads.settings")} subtitle={t("admin.ads.settingsHint")}>
          <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              />
              {t("admin.ads.settingsEnabled")}
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="opacity-70">{t("admin.ads.settingsDuration")}</span>
              <input
                type="number"
                min={2000}
                max={60000}
                step={500}
                value={settings.default_duration_ms}
                onChange={(e) =>
                  setSettings({ ...settings, default_duration_ms: Number(e.target.value) || 5500 })
                }
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="opacity-70">{t("admin.ads.settingsMaxHeight")}</span>
              <input
                type="number"
                min={60}
                max={400}
                value={settings.max_height_px}
                onChange={(e) =>
                  setSettings({ ...settings, max_height_px: Number(e.target.value) || 140 })
                }
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
              />
            </label>
            <div className="flex flex-col gap-2 text-sm justify-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.pause_on_hover}
                  onChange={(e) => setSettings({ ...settings, pause_on_hover: e.target.checked })}
                />
                {t("admin.ads.settingsPause")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.show_arrows}
                  onChange={(e) => setSettings({ ...settings, show_arrows: e.target.checked })}
                />
                {t("admin.ads.settingsArrows")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.show_dots}
                  onChange={(e) => setSettings({ ...settings, show_dots: e.target.checked })}
                />
                {t("admin.ads.settingsDots")}
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl african-gradient text-white text-sm font-medium disabled:opacity-60"
              >
                {t("admin.ads.save")}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-sm"
              >
                {t("admin.ads.cancel")}
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {showForm && (
        <AdminPanel
          title={editingId ? t("admin.ads.edit") : t("admin.ads.add")}
          subtitle={t("admin.ads.formHint")}
          action={
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100"
              aria-label={t("admin.ads.cancel")}
            >
              <X size={16} />
            </button>
          }
        >
          <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2 content-start">
              <label className="sm:col-span-2 space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldTitle")}</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
                />
              </label>
              <label className="sm:col-span-2 space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldAlt")}</span>
                <input
                  value={form.alt_text}
                  onChange={(e) => setForm((f) => ({ ...f, alt_text: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
                />
              </label>
              <label className="sm:col-span-2 space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldLink")}</span>
                <input
                  type="url"
                  value={form.link_url}
                  onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldSponsor")}</span>
                <input
                  value={form.sponsor_label}
                  onChange={(e) => setForm((f) => ({ ...f, sponsor_label: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldDuration")}</span>
                <input
                  type="number"
                  min={2000}
                  max={60000}
                  step={500}
                  value={form.duration_ms}
                  onChange={(e) => setForm((f) => ({ ...f, duration_ms: e.target.value }))}
                  placeholder={String(settings?.default_duration_ms ?? 5500)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldStarts")}</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  disabled={form.clear_schedule}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 disabled:opacity-40"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldEnds")}</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  disabled={form.clear_schedule}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 disabled:opacity-40"
                />
              </label>
              <label className="sm:col-span-2 space-y-1.5 text-sm">
                <span className="opacity-70">{t("admin.ads.fieldNotes")}</span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 resize-y"
                />
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  {t("admin.ads.fieldActive")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.open_in_new_tab}
                    onChange={(e) => setForm((f) => ({ ...f, open_in_new_tab: e.target.checked }))}
                  />
                  {t("admin.ads.fieldNewTab")}
                </label>
                {editingId && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.clear_schedule}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          clear_schedule: e.target.checked,
                          starts_at: e.target.checked ? "" : f.starts_at,
                          ends_at: e.target.checked ? "" : f.ends_at,
                        }))
                      }
                    />
                    {t("admin.ads.clearSchedule")}
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm opacity-70">{t("admin.ads.fieldImage")}</p>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0] ?? null;
                  setImageFile(file);
                }}
                className={clsx(
                  "relative rounded-2xl border-2 border-dashed overflow-hidden min-h-[160px] flex items-center justify-center cursor-pointer transition-colors",
                  dragOver
                    ? "border-africhess-gold bg-africhess-gold/10"
                    : "border-[var(--border-subtle)] bg-black/20"
                )}
              >
                {formPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-4 py-8 space-y-2 opacity-70">
                    <ImagePlus className="mx-auto" size={28} />
                    <p className="text-sm">{t("admin.ads.dropHint")}</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="text-xs opacity-50">{t("admin.ads.previewHint")}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl african-gradient text-white text-sm font-medium disabled:opacity-60"
                >
                  {saving ? t("admin.ads.saving") : t("admin.ads.save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-sm"
                >
                  {t("admin.ads.cancel")}
                </button>
              </div>
            </div>
          </form>
        </AdminPanel>
      )}

      <AdminPanel
        title={
          <span className="inline-flex items-center gap-2">
            <Megaphone size={16} />
            {t("admin.ads.listTitle")}
          </span>
        }
        subtitle={t("admin.ads.listHint", { count: filtered.length })}
      >
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  filter === f.key
                    ? "african-gradient text-white border-transparent"
                    : "border-[var(--border-subtle)] opacity-75 hover:opacity-100"
                )}
              >
                {f.label}
                {f.count != null ? ` · ${f.count}` : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("admin.ads.search")}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent pl-9 pr-3 py-2 text-sm"
              />
            </label>
            {selected.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => runBulk("activate")}
                  className="px-3 py-1.5 rounded-lg text-xs border border-emerald-500/40 text-emerald-500"
                >
                  {t("admin.ads.bulkActivate")} ({selected.size})
                </button>
                <button
                  type="button"
                  onClick={() => runBulk("deactivate")}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border-subtle)]"
                >
                  {t("admin.ads.bulkDeactivate")}
                </button>
                <button
                  type="button"
                  onClick={() => runBulk("delete")}
                  className="px-3 py-1.5 rounded-lg text-xs border border-red-500/40 text-red-400"
                >
                  {t("admin.ads.bulkDelete")}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <AdminSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <AdminEmpty>{t("admin.ads.empty")}</AdminEmpty>
        ) : (
          <ul className="space-y-3">
            <li className="flex items-center gap-2 px-1 text-xs opacity-55">
              <button type="button" onClick={toggleSelectAllFiltered} className="p-1">
                {filtered.every((s) => selected.has(s.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
              </button>
              {t("admin.ads.selectAll")}
            </li>
            {filtered.map((slide) => {
              const globalIndex = slides.findIndex((s) => s.id === slide.id);
              return (
                <li
                  key={slide.id}
                  className={clsx(
                    "flex flex-col sm:flex-row gap-3 sm:items-center rounded-xl border p-3 transition-colors",
                    selected.has(slide.id)
                      ? "border-africhess-gold/50 bg-africhess-gold/5"
                      : "border-[var(--border-subtle)]"
                  )}
                >
                  <button type="button" onClick={() => toggleSelect(slide.id)} className="self-start sm:self-center p-1">
                    {selected.has(slide.id) ? <CheckSquare size={16} /> : <Square size={16} className="opacity-40" />}
                  </button>
                  <div className="relative w-full sm:w-44 h-24 rounded-lg overflow-hidden bg-black/20 shrink-0">
                    {slide.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-40">
                        <Ban size={18} />
                      </div>
                    )}
                    {slide.sponsor_label ? (
                      <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                        {slide.sponsor_label}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium truncate">{slide.title}</p>
                      <AdminBadge tone={statusTone(slide.schedule_status)}>
                        {t(`admin.ads.status.${slide.schedule_status}`)}
                      </AdminBadge>
                    </div>
                    {slide.link_url ? (
                      <a
                        href={slide.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-africhess-gold inline-flex items-center gap-1 truncate max-w-full"
                      >
                        <ExternalLink size={12} />
                        <span className="truncate">{slide.link_url}</span>
                      </a>
                    ) : (
                      <p className="text-xs opacity-50">{t("admin.ads.noLink")}</p>
                    )}
                    <p className="text-[11px] opacity-50 tabular-nums">
                      {t("admin.ads.statsLine", {
                        clicks: slide.click_count,
                        impressions: slide.impression_count,
                        duration: slide.duration_ms ?? settings?.default_duration_ms ?? 5500,
                      })}
                    </p>
                    {slide.notes ? <p className="text-[11px] opacity-45 line-clamp-1">{slide.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <button
                      type="button"
                      title={t("admin.ads.moveUp")}
                      onClick={() => move(globalIndex, -1)}
                      disabled={globalIndex <= 0}
                      className="p-2 rounded-lg border border-[var(--border-subtle)] disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      title={t("admin.ads.moveDown")}
                      onClick={() => move(globalIndex, 1)}
                      disabled={globalIndex < 0 || globalIndex >= slides.length - 1}
                      className="p-2 rounded-lg border border-[var(--border-subtle)] disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      title={slide.is_active ? t("admin.ads.deactivate") : t("admin.ads.activate")}
                      onClick={() => toggleActive(slide)}
                      className="p-2 rounded-lg border border-[var(--border-subtle)]"
                    >
                      {slide.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      title={t("admin.ads.duplicate")}
                      onClick={() => duplicate(slide.id)}
                      className="p-2 rounded-lg border border-[var(--border-subtle)]"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      title={t("admin.ads.edit")}
                      onClick={() => startEdit(slide)}
                      className="p-2 rounded-lg border border-[var(--border-subtle)]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      title={t("admin.ads.delete")}
                      onClick={() => remove(slide.id)}
                      className="p-2 rounded-lg border border-red-500/40 text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
