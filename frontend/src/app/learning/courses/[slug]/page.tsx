"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LessonReader } from "@/components/learning/LessonReader";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

interface Lesson {
  id: number;
  title: string;
  content: string;
  video_url: string;
  order: number;
}

interface QuizQ {
  question: string;
  options: string[];
}

export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [course, setCourse] = useState<{
    title: string;
    description: string;
    lessons: Lesson[];
    quizzes: { id: number; title: string; questions: QuizQ[] }[];
    user_progress: { progress_percent: number; completed_lesson_ids: number[] };
  } | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!slug) return;
    learningApi.course(slug).then(({ data }) => {
      setCourse(data);
      if (data.lessons?.length) setActiveLesson(data.lessons[0]);
    });
  }, [slug]);

  const completeLesson = async (lessonId: number) => {
    if (!user || !slug) return;
    try {
      const { data } = await learningApi.completeLesson(slug, lessonId);
      setMsg(data.xp_gained ? `+${data.xp_gained} XP` : t("learning.lesson.alreadyDone"));
      const { data: refreshed } = await learningApi.course(slug);
      setCourse(refreshed);
    } catch {
      setMsg(t("learning.progress.saveLogin"));
    }
  };

  const submitQuiz = async (quizId: number) => {
    if (!user) return;
    try {
      const { data } = await learningApi.submitQuiz(quizId, quizAnswers);
      setQuizResult(
        data.passed
          ? `Réussi (${data.score}%) — +${data.xp_gained} XP`
          : `Score ${data.score}% — minimum ${data.passed ? 0 : 66}% requis`
      );
    } catch {
      setQuizResult("Erreur lors de l'envoi");
    }
  };

  if (!course) return <p className="p-8 text-center">{t("common.loading")}</p>;

  const completed = new Set(course.user_progress?.completed_lesson_ids ?? []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline mb-4 inline-block">
        ← Apprentissage
      </Link>
      <h1 className="font-display text-3xl font-bold">{course.title}</h1>
      <p className="opacity-70 mt-2 mb-6">{course.description}</p>
      <p className="text-sm text-africhess-green mb-6">
        Progression : {course.user_progress?.progress_percent ?? 0}%
      </p>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="glass-card p-3 space-y-1 h-fit">
          {course.lessons.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setActiveLesson(l)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeLesson?.id === l.id ? "bg-africhess-gold/20" : "hover:bg-white/5"
              }`}
            >
              {completed.has(l.id) ? "✓ " : ""}
              {l.order}. {l.title}
            </button>
          ))}
        </aside>

        {activeLesson && (
          <article className="glass-card p-6">
            <h2 className="font-semibold text-xl mb-4">{activeLesson.title}</h2>
            {activeLesson.video_url && (
              <a
                href={activeLesson.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-africhess-gold mb-4 inline-block"
              >
                Voir la vidéo →
              </a>
            )}
            <LessonReader content={activeLesson.content} title={activeLesson.title} />
            {user && (
              <button
                type="button"
                onClick={() => completeLesson(activeLesson.id)}
                className="mt-6 px-5 py-2 rounded-lg african-gradient text-white text-sm"
              >
                Marquer comme terminée
              </button>
            )}
            {msg && <p className="mt-2 text-sm text-africhess-gold">{msg}</p>}
          </article>
        )}
      </div>

      {course.quizzes?.map((q) => (
        <section key={q.id} className="glass-card p-6 mt-8">
          <h3 className="font-semibold text-lg mb-4">{q.title}</h3>
          {q.questions.map((question, qi) => (
            <div key={qi} className="mb-4">
              <p className="font-medium text-sm mb-2">{question.question}</p>
              <div className="space-y-2">
                {question.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`q${qi}`}
                      checked={quizAnswers[qi] === oi}
                      onChange={() => {
                        const next = [...quizAnswers];
                        next[qi] = oi;
                        setQuizAnswers(next);
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {user && (
            <button
              type="button"
              onClick={() => submitQuiz(q.id)}
              className="px-5 py-2 rounded-lg border border-africhess-green text-africhess-green"
            >
              Valider le quiz
            </button>
          )}
          {quizResult && <p className="mt-3 text-sm">{quizResult}</p>}
        </section>
      ))}
    </div>
  );
}
