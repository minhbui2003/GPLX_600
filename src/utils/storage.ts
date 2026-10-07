import type { UserProgress, ExamResult } from '../types';

const STORAGE_KEY = 'hoc_b_progress_v1';
const THEME_KEY = 'hoc_b_theme';

const EMPTY_PROGRESS: UserProgress = {
  answeredQuestions: {},
  wrongCount: {},
  favorites: [],
  examHistory: [],
  learning: {}
};

export function loadTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    console.error(e);
  }
  return 'dark';
}

export function saveTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error(e);
  }
}

export function loadProgress(): UserProgress {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as Partial<UserProgress>;
      return {
        answeredQuestions: parsed.answeredQuestions || {},
        wrongCount: parsed.wrongCount || {},
        favorites: parsed.favorites || [],
        examHistory: parsed.examHistory || [],
        learning: parsed.learning || {}
      };
    }
  } catch (e) {
    console.error('Failed to load progress from localStorage:', e);
  }
  return { ...EMPTY_PROGRESS };
}

export function saveProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress to localStorage:', e);
  }
}

export function recordAnswer(
  qId: number,
  selected: number,
  isCorrect: boolean,
  prevProgress: UserProgress
): UserProgress {
  const now = Date.now();
  const previousLearning = prevProgress.learning[qId];
  const nextStreak = isCorrect ? (previousLearning?.correctStreak || 0) + 1 : 0;
  const intervals = [1, 3, 7, 14, 30, 60];
  const intervalDays = isCorrect ? intervals[Math.min(nextStreak - 1, intervals.length - 1)] : 0;

  const next: UserProgress = {
    ...prevProgress,
    answeredQuestions: {
      ...prevProgress.answeredQuestions,
      [qId]: {
        selected,
        isCorrect,
        timestamp: now
      }
    },
    wrongCount: {
      ...prevProgress.wrongCount,
      [qId]: isCorrect
        ? Math.max(0, (prevProgress.wrongCount[qId] || 0) - 1)
        : (prevProgress.wrongCount[qId] || 0) + 1
    },
    learning: {
      ...prevProgress.learning,
      [qId]: {
        attempts: (previousLearning?.attempts || 0) + 1,
        correctStreak: nextStreak,
        intervalDays,
        lastAnsweredAt: now,
        // Câu sai quay lại sau 10 phút; câu đúng giãn dần 1, 3, 7, 14... ngày.
        nextReviewAt: isCorrect
          ? now + intervalDays * 24 * 60 * 60 * 1000
          : now + 10 * 60 * 1000
      }
    }
  };
  saveProgress(next);
  return next;
}

export function toggleFavorite(qId: number, prevProgress: UserProgress): UserProgress {
  const isFav = prevProgress.favorites.includes(qId);
  const next: UserProgress = {
    ...prevProgress,
    favorites: isFav
      ? prevProgress.favorites.filter(id => id !== qId)
      : [...prevProgress.favorites, qId]
  };
  saveProgress(next);
  return next;
}

export function resetSingleQuestion(qId: number, prevProgress: UserProgress): UserProgress {
  const newAnswered = { ...prevProgress.answeredQuestions };
  delete newAnswered[qId];

  const newWrong = { ...prevProgress.wrongCount };
  delete newWrong[qId];

  const newLearning = { ...prevProgress.learning };
  delete newLearning[qId];

  const next: UserProgress = {
    ...prevProgress,
    answeredQuestions: newAnswered,
    wrongCount: newWrong,
    learning: newLearning
  };
  saveProgress(next);
  return next;
}

export function resetQuestionsList(qIds: number[], prevProgress: UserProgress): UserProgress {
  const newAnswered = { ...prevProgress.answeredQuestions };
  const newWrong = { ...prevProgress.wrongCount };
  const newLearning = { ...prevProgress.learning };

  qIds.forEach(id => {
    delete newAnswered[id];
    delete newWrong[id];
    delete newLearning[id];
  });

  const next: UserProgress = {
    ...prevProgress,
    answeredQuestions: newAnswered,
    wrongCount: newWrong,
    learning: newLearning
  };
  saveProgress(next);
  return next;
}

export function saveExamResult(result: ExamResult, prevProgress: UserProgress): UserProgress {
  const next: UserProgress = {
    ...prevProgress,
    examHistory: [result, ...prevProgress.examHistory.slice(0, 19)]
  };
  saveProgress(next);
  return next;
}

export function resetAllProgress(): UserProgress {
  const clean: UserProgress = { ...EMPTY_PROGRESS };
  saveProgress(clean);
  return clean;
}
