import { api } from "./api";

export const learningApi = {
  dashboard: () => api.get("/learning/dashboard/"),
  profile: () => api.get("/learning/profile/"),
  coach: () => api.get("/learning/coach/"),
  insights: () => api.get("/learning/insights/"),
  videos: (category?: string, lang?: string) =>
    api.get("/learning/videos/", { params: { category, lang } }),
  repertoires: () => api.get("/learning/repertoires/"),
  createRepertoire: (name: string, color: string) =>
    api.post("/learning/repertoires/", { name, color }),
  addRepertoireLine: (repId: number, name: string, moves_san: string[]) =>
    api.post(`/learning/repertoires/${repId}/lines/`, { name, moves_san }),
  deleteRepertoireLine: (repId: number, lineId: number) =>
    api.delete(`/learning/repertoires/${repId}/lines/${lineId}/`),
  studyLines: () => api.get("/learning/study/"),
  createStudyLine: (data: { name: string; color?: string; moves_uci?: string[]; pgn?: string }) =>
    api.post("/learning/study/", data),
  studyReviewDue: () => api.get("/learning/study/review/"),
  submitStudyReview: (lineId: number, moves: string[]) =>
    api.post(`/learning/study/${lineId}/review/`, { moves }),
  classrooms: () => api.get("/learning/classroom/"),
  createClassroom: (title?: string) => api.post("/learning/classroom/", { title }),
  getClassroom: (code: string) => api.get("/learning/classroom/", { params: { code } }),
  updateClassroom: (code: string, data: { fen?: string; is_active?: boolean }) =>
    api.patch(`/learning/classroom/${code}/`, data),
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
  dailyPuzzle: () => api.get("/puzzles/daily/"),
  adaptivePuzzles: (count = 10) =>
    api.get("/learning/puzzles/adaptive/", { params: { count } }),
  submitPuzzle: (id: number, moves: string[], timeSeconds: number) =>
    api.post(`/puzzles/${id}/submit/`, {
      moves,
      time_seconds: timeSeconds,
    }),
  badges: () => api.get("/learning/badges/"),
  myBadges: () => api.get("/learning/badges/mine/"),
  progress: () => api.get("/learning/progress/"),
  endgameDrills: (theme?: string) =>
    api.get("/learning/endgames/", { params: theme ? { theme } : {} }),
  practice: () => api.get("/learning/practice/"),
  practiceStudy: (slug: string) => api.get(`/learning/practice/studies/${slug}/`),
  practiceChapter: (id: number) => api.get(`/learning/practice/chapters/${id}/`),
  practiceComplete: (id: number, nb_moves = 0) =>
    api.post(`/learning/practice/chapters/${id}/complete/`, { nb_moves }),
};

export const marketplaceApi = {
  streamers: () => api.get("/social/streamers/"),
  coaches: () => api.get("/social/coaches/"),
};
