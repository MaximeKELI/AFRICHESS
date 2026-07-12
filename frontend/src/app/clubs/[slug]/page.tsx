"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import { ClubChat } from "@/components/social/ClubChat";
import { Users, ArrowLeft } from "lucide-react";

interface ClubDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  member_count: number;
  is_member: boolean;
  owner: { username: string; display_name: string };
}

interface ClubEventRow {
  id: number;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
}

export default function ClubDetailPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [events, setEvents] = useState<ClubEventRow[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [arenaOpponent, setArenaOpponent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = () => {
    socialApi
      .club(slug)
      .then(({ data }) => {
        setClub(data);
        if (data.is_member) {
          socialApi.clubEvents(slug).then(({ data: ev }) => {
            setEvents(Array.isArray(ev) ? ev : []);
          }).catch(() => setEvents([]));
        }
      })
      .catch((err) => setError(formatApiError(err, t("clubs.error.load"))));
  };

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      await socialApi.joinClub(slug);
      load();
      setError(null);
    } catch (err) {
      setError(formatApiError(err, t("clubs.error.join")));
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    if (!window.confirm(t("clubs.leaveConfirm"))) return;
    setJoining(true);
    try {
      await socialApi.leaveClub(slug);
      load();
      setError(null);
    } catch (err) {
      setError(formatApiError(err, t("clubs.error.leave")));
    } finally {
      setJoining(false);
    }
  };

  const createEvent = async () => {
    if (!eventTitle.trim()) return;
    try {
      await socialApi.createClubEvent(slug, {
        title: eventTitle.trim(),
        starts_at: eventDate || new Date().toISOString(),
      });
      setEventTitle("");
      setEventDate("");
      load();
    } catch (err) {
      setError(formatApiError(err, t("clubs.error.load")));
    }
  };

  const startArena = async () => {
    if (!arenaOpponent.trim()) return;
    try {
      const { data } = await socialApi.clubArena(slug, arenaOpponent.trim());
      window.location.href = `/tournaments?open=${data.slug}`;
    } catch (err) {
      setError(formatApiError(err, t("clubs.error.load")));
    }
  };

  if (!club && !error) return <p className="max-w-3xl mx-auto px-4 py-12 opacity-60">{t("common.loading")}</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <Link href="/clubs" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
        <ArrowLeft size={16} />
        {t("clubs.back")}
      </Link>

      {error && <InlineAlert>{error}</InlineAlert>}

      {club && (
        <>
          <div className="glass-card p-6">
            <h1 className="font-display text-2xl font-bold">{club.name}</h1>
            <p className="text-sm opacity-70 mt-2 flex items-center gap-2">
              <Users size={14} />
              {t("clubs.members", { count: club.member_count })}
              {club.country && (
                <span>
                  · {countryFlag(club.country)} {displayCountry(club.country, locale)}
                </span>
              )}
            </p>
            <p className="mt-4 text-sm opacity-90 whitespace-pre-wrap">
              {club.description || t("clubs.noDescription")}
            </p>
            <p className="text-xs opacity-50 mt-4">
              {t("clubs.owner")}: {club.owner.display_name || club.owner.username}
            </p>
          </div>

          {user ? (
            club.is_member ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-africhess-green">{t("clubs.alreadyMember")}</p>
                  {user.username !== club.owner.username && (
                    <button
                      type="button"
                      disabled={joining}
                      onClick={handleLeave}
                      className="px-3 py-1.5 rounded-lg border border-white/20 text-sm disabled:opacity-50"
                    >
                      {t("clubs.leave")}
                    </button>
                  )}
                </div>
                <ClubChat slug={slug} />

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-semibold">{t("clubs.events.title")}</h2>
                  {events.length === 0 ? (
                    <p className="text-sm opacity-60">{t("clubs.events.empty")}</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {events.map((ev) => (
                        <li key={ev.id} className="border-b border-white/5 pb-2">
                          <span className="font-medium">{ev.title}</span>
                          <span className="text-xs opacity-50 ml-2">
                            {new Date(ev.starts_at).toLocaleDateString(locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <input
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder={t("clubs.events.titleLabel")}
                      className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border bg-transparent text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border bg-transparent text-sm"
                    />
                    <button type="button" onClick={createEvent} className="px-4 py-2 text-sm african-gradient text-white rounded-lg">
                      {t("clubs.events.create")}
                    </button>
                  </div>
                </div>

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-semibold">{t("clubs.arena.title")}</h2>
                  <div className="flex gap-2">
                    <input
                      value={arenaOpponent}
                      onChange={(e) => setArenaOpponent(e.target.value)}
                      placeholder={t("clubs.arena.opponent")}
                      className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm"
                    />
                    <button type="button" onClick={startArena} className="px-4 py-2 text-sm african-gradient text-white rounded-lg">
                      {t("clubs.arena.submit")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="px-6 py-3 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
              >
                {joining ? t("clubs.joining") : t("clubs.join")}
              </button>
            )
          ) : (
            <p className="text-sm opacity-70">
              <Link href="/login" className="text-africhess-gold underline">{t("nav.login")}</Link>
              {" "}{t("clubs.loginHint")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
