"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adsApi, type AdCarouselSettings, type AdSlidePublic } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

const FALLBACK_MS = 5500;

export function AdCarousel() {
  const { t } = useTranslation();
  const lowBandwidth = useAuthStore((s) => s.lowBandwidth);
  const [slides, setSlides] = useState<AdSlidePublic[]>([]);
  const [settings, setSettings] = useState<AdCarouselSettings | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (lowBandwidth) return;
    let cancelled = false;
    adsApi
      .active()
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data?.slides)
          ? data.slides.filter((s) => Boolean(s.image_url))
          : [];
        setSettings(data?.settings ?? null);
        setSlides(list);
        setIndex(0);
        if (!trackedRef.current && list.length) {
          trackedRef.current = true;
          adsApi.trackImpressions(list.map((s) => s.id)).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlides([]);
          setSettings(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lowBandwidth]);

  const count = slides.length;
  const enabled = settings?.enabled !== false;
  const go = useCallback(
    (dir: -1 | 1) => {
      if (count < 2) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  const slide = slides[index];
  const duration =
    slide?.duration_ms || settings?.default_duration_ms || FALLBACK_MS;
  const pauseOnHover = settings?.pause_on_hover !== false;

  useEffect(() => {
    if (lowBandwidth || !enabled || paused || count < 2) return;
    const id = window.setInterval(() => go(1), duration);
    return () => window.clearInterval(id);
  }, [lowBandwidth, enabled, paused, count, go, duration]);

  if (lowBandwidth || !enabled || count === 0 || !slide) return null;

  const maxH = settings?.max_height_px ?? 140;
  const content = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.image_url}
      alt={slide.alt || slide.title}
      className="w-full h-full object-cover"
      draggable={false}
    />
  );

  const onOpen = () => {
    adsApi.trackClick(slide.id).catch(() => undefined);
  };

  const linkTarget = slide.open_in_new_tab === false ? undefined : "_blank";
  const linkRel =
    slide.open_in_new_tab === false ? "sponsored" : "noopener noreferrer sponsored";

  return (
    <aside
      className="ad-carousel border-t border-[var(--border-subtle)] bg-black/30"
      aria-label={t("ads.carouselLabel")}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start == null || end == null) return;
        const delta = end - start;
        if (Math.abs(delta) < 40) return;
        go(delta < 0 ? 1 : -1);
      }}
    >
      <div className="relative max-w-7xl mx-auto">
        <div
          className="relative w-full aspect-[6/1] min-h-[72px] overflow-hidden"
          style={{ maxHeight: maxH }}
        >
          {slide.link_url ? (
            <a
              href={slide.link_url}
              target={linkTarget}
              rel={linkRel}
              className="block w-full h-full"
              aria-label={slide.title}
              onClick={onOpen}
            >
              {content}
            </a>
          ) : (
            <div className="w-full h-full">{content}</div>
          )}
          {slide.sponsor_label ? (
            <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-black/55 text-white/90">
              {slide.sponsor_label}
            </span>
          ) : null}
        </div>

        {count > 1 && settings?.show_arrows !== false && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/45 text-white/90 hover:bg-black/65"
              aria-label={t("ads.prev")}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/45 text-white/90 hover:bg-black/65"
              aria-label={t("ads.next")}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
        {count > 1 && settings?.show_dots !== false && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`${i + 1} / ${count}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={
                  i === index
                    ? "w-2 h-2 rounded-full bg-africhess-gold"
                    : "w-2 h-2 rounded-full bg-white/40 hover:bg-white/70"
                }
              />
            ))}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {slide.title}
      </p>
    </aside>
  );
}
