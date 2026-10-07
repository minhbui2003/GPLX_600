export interface Question {
  id: number;
  chapter: number;
  chapterName: string;
  question: string;
  image: string | null;
  options: string[];
  correctAnswer: number;
  isCritical: boolean;
  explanation: string | null;
}

export type ViewMode = 'dashboard' | 'review' | 'learn' | 'critical' | 'exam' | 'wrong' | 'tips' | 'favorites';

export interface LearningState {
  attempts: number;
  correctStreak: number;
  intervalDays: number;
  lastAnsweredAt: number;
  nextReviewAt: number;
}

export interface UserProgress {
  answeredQuestions: Record<number, {
    selected: number;
    isCorrect: boolean;
    timestamp: number;
  }>;
  wrongCount: Record<number, number>;
  favorites: number[]; // question IDs
  examHistory: ExamResult[];
  learning: Record<number, LearningState>;
}

export interface ExamResult {
  id: string;
  date: number;
  score: number;
  total: number;
  passed: boolean;
  failedReason?: string;
  durationSeconds: number;
  wrongIds: number[];
}
