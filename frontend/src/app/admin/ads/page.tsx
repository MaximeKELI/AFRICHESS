"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { adminApi, type AdSlideAdmin } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
  AdminBadge,
} from "@/components/admin/AdminPrimitives";

type FormState = {
  title: string;
  link_url: string;
  is_active: boolean;
  order: number;
  starts_at: string;
  ends_at: string;
  image: File | null;
};

const emptyForm = (): FormState => ({
  title: "",
  link_url: "",
  is_active: true,
  order: 0,
  starts_at: "",
  ends_at: "",
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
  fd.append("link_url", form.link_url.trim());
  fd.append("is_active", form.is_active ? "true" : "false");
  fd.append("order", String(form.order));
  if (form.starts_at) fd.append("starts_at", new Date(form.starts_at).toISOString());
  if (form.ends_at) fd.append("ends_at", new Date(form.ends_at).toISOString());
  if (includeImage && form.image) fd.append("image", form.image);
  return fd;
}

export default function AdminAdsPage() {
  const { t } = useTranslation();
  const [slides, setSlides] = useState<AdSlideAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .adsList()
      .then(({ data }) => {
        setSlides(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), order: slides.length });
    setShowForm(true);
  };

  const startEdit = (slide: AdSlideAdmin) => {
    setEditingId(slide.id);
    setForm({
      title: slide.title,
      link_url: slide.link_url || "",
      is_active: slide.is_active,
      order: slide.order,
      starts_at: toLocalInput(slide.starts_at),
      ends_at: toLocalInput(slide.ends_at),
      image: null,
    });
    setShowForm(true);
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
      } else {
        await adminApi.adsCreate(buildFormData(form, true));
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
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.ads.saveError")));
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(t("admin.ads.confirmDelete"))) return;
    try {
      await adminApi.adsDelete(id);
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.ads.title")}
        description={t("admin.ads.subtitle")}
        actions={
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl african-gradient text-white text-sm font-medium"
          >
            <Plus size={16} />
            {t("admin.ads.add")}
          </button>
        }
      />

      {error && <InlineAlert variant="error">{error}</InlineAlert>}

      {showForm && (
        <AdminPanel
          title={editingId ? t("admin.ads.edit") : t("admin.ads.add")}
          subtitle={t("admin.ads.formHint")}
        >
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
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
              <span className="opacity-70">{t("admin.ads.fieldImage")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required={!editingId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image: e.target.files?.[0] ?? null }))
                }
                className="w-full text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              {t("admin.ads.fieldActive")}
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="opacity-70">{t("admin.ads.fieldStarts")}</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="opacity-70">{t("admin.ads.fieldEnds")}</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
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
        subtitle={t("admin.ads.listHint", { count: slides.length })}
      >
        {loading ? (
          <AdminSkeleton rows={4} />
        ) : slides.length === 0 ? (
          <AdminEmpty>{t("admin.ads.empty")}</AdminEmpty>
        ) : (
          <ul className="space-y-3">
            {slides.map((slide, index) => (
              <li
                key={slide.id}
                className="flex flex-col sm:flex-row gap-3 sm:items-center rounded-xl border border-[var(--border-subtle)] p-3"
              >
                <div className="relative w-full sm:w-40 h-20 rounded-lg overflow-hidden bg-black/20 shrink-0">
                  {slide.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium truncate">{slide.title}</p>
                    <AdminBadge tone={slide.is_active ? "ok" : "neutral"}>
                      {slide.is_active ? t("admin.ads.active") : t("admin.ads.inactive")}
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
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    type="button"
                    title={t("admin.ads.moveUp")}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="p-2 rounded-lg border border-[var(--border-subtle)] disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    title={t("admin.ads.moveDown")}
                    onClick={() => move(index, 1)}
                    disabled={index === slides.length - 1}
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
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
