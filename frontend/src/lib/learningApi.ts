import { api } from "./api";

export const learningApi = {
  dashboard: () => api.get("/learning/dashboard/"),
  profile: () => api.get("/learning/profile/"),
  coach: () => api.get("/learning/coach/"),
  courses: (level?: string) =>
    api.get("/learning/courses/", { params: level ? { level } : {} }),
  course: (slug: string, lang?: string) =>
    api.get(`/learning/courses/${slug}/`, { params: lang ? { lang } : {} }),
  completeLesson: (slug: string, lessonId: number) =>
    api.post(`/learning/courses/${slug}/complete-lesson/`, { lesson_id: lessonId }),
  lesson: (id: number) => api.get(`/learning/lessons/${id}/`),
  quiz: (id: number) => api.get(`/learning/quizzes/${id}/`),
  submitQuiz: (id: number, answers: number[]) =>
    api.post(`/learning/quizzes/${id}/submit/`, { answers }),
  analyzePgn: (pgn: string) => api.post("/learning/analyze/", { pgn }),
  dailyPuzzle: () => api.get("/learning/puzzles/daily/"),
  adaptivePuzzles: (count = 10) =>
    api.get("/learning/puzzles/adaptive/", { params: { count } }),
  submitPuzzle: (id: number, moves: string[], timeSeconds: number) =>
    api.post(`/learning/puzzles/${id}/attempt/`, {
      moves,
      time_seconds: timeSeconds,
    }),
  badges: () => api.get("/learning/badges/"),
  myBadges: () => api.get("/learning/badges/mine/"),
  progress: () => api.get("/learning/progress/"),
};
