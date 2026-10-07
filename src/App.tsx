import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  AlertTriangle,
  Timer,
  Lightbulb,
  XCircle,
  Home,
  Star,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Trophy,
  Grid,
  ShieldAlert,
  Check,
  X,
  Sparkles,
  Menu,
  Sun,
  Moon,
  Trash2,
  RefreshCw,
  FolderSync,
  Shuffle,
  Brain,
  Target,
  Zap,
  ChevronRight
} from 'lucide-react';

import questionsRaw from './data/questions.json';
import type { Question, ViewMode, UserProgress, ExamResult } from './types';
import { getTipForQuestion, HANDBOOK_TIPS } from './data/tips';
import { generateExam } from './utils/examGenerator';
import {
  loadProgress,
  recordAnswer,
  toggleFavorite,
  saveExamResult,
  resetAllProgress,
  resetSingleQuestion,
  resetQuestionsList,
  loadTheme,
  saveTheme
} from './utils/storage';

const allQuestions = questionsRaw as Question[];
const questionsById = new Map<number, Question>(allQuestions.map(q => [q.id, q]));
const REVIEW_SIZE = 20;

function shuffleQuestions(items: Question[]): Question[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildSmartReview(progress: UserProgress, limit = REVIEW_SIZE): Question[] {
  const now = Date.now();
  const difficult = shuffleQuestions(allQuestions.filter(q => (progress.wrongCount[q.id] || 0) > 0))
    .sort((a, b) => (progress.wrongCount[b.id] || 0) - (progress.wrongCount[a.id] || 0));
  const due = shuffleQuestions(allQuestions.filter(q => {
    const learning = progress.learning[q.id];
    return learning && learning.nextReviewAt <= now && !(progress.wrongCount[q.id] > 0);
  }));
  const unseen = shuffleQuestions(allQuestions.filter(q => !progress.answeredQuestions[q.id]));
  const fresh = shuffleQuestions(allQuestions.filter(q => progress.answeredQuestions[q.id]));
  const unique = new Map<number, Question>();

  [...difficult, ...due, ...unseen, ...fresh].forEach(q => {
    if (unique.size < limit) unique.set(q.id, q);
  });
  return [...unique.values()];
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(loadTheme);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [progress, setProgress] = useState<UserProgress>(loadProgress);

  // Drawer & Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isExamResultModalOpen, setIsExamResultModalOpen] = useState<boolean>(false);

  // Active study filter state
  const [activeChapterFilter, setActiveChapterFilter] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, { selected: number; isCorrect: boolean }>>({});

  // Shuffle State
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [shuffledIds, setShuffledIds] = useState<number[] | null>(null);

  // Exam state
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [examTimeLeft, setExamTimeLeft] = useState<number>(1200); // 20 minutes
  const [isExamRunning, setIsExamRunning] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [isReviewingExam, setIsReviewingExam] = useState<boolean>(false);

  // Timer interval ref
  const timerRef = useRef<number | null>(null);
  const questionTopRef = useRef<HTMLDivElement | null>(null);

  // Sync theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#07111f' : '#f1f5f9'
    );
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Base list of questions (ordered by original ID)
  const baseQuestionList = useMemo(() => {
    if (isReviewingExam && examQuestions.length > 0) {
      return examQuestions;
    }
    if (viewMode === 'critical') {
      return allQuestions.filter(q => q.isCritical);
    }
    if (viewMode === 'review') {
      return reviewQuestions;
    }
    if (viewMode === 'wrong') {
      const wrongIds = Object.keys(progress.wrongCount)
        .map(Number)
        .filter(id => (progress.wrongCount[id] || 0) > 0 || !!sessionAnswers[id]);
      return allQuestions.filter(q => wrongIds.includes(q.id));
    }
    if (viewMode === 'favorites') {
      return allQuestions.filter(q => progress.favorites.includes(q.id));
    }
    if (viewMode === 'learn') {
      if (activeChapterFilter !== null) {
        return allQuestions.filter(q => q.chapter === activeChapterFilter);
      }
      return allQuestions;
    }
    if (viewMode === 'exam') {
      return examQuestions;
    }
    return allQuestions;
  }, [viewMode, activeChapterFilter, progress, isReviewingExam, examQuestions, reviewQuestions, sessionAnswers]);

  // When base list changes or user requests re-shuffle:
  useEffect(() => {
    if (isShuffled && viewMode !== 'exam' && !isReviewingExam) {
      const ids = baseQuestionList.map(q => q.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setShuffledIds(ids);
      setCurrentQuestionIndex(0);
    } else {
      setShuffledIds(null);
    }
  }, [isShuffled, viewMode, activeChapterFilter]);

  // Final question list
  const currentQuestionList = useMemo(() => {
    if (isShuffled && shuffledIds && viewMode !== 'exam' && !isReviewingExam) {
      return shuffledIds.map(id => questionsById.get(id)!).filter(Boolean);
    }
    return baseQuestionList;
  }, [isShuffled, shuffledIds, baseQuestionList, viewMode, isReviewingExam]);

  const currentQ = currentQuestionList[currentQuestionIndex] || currentQuestionList[0];

  useEffect(() => {
    if (viewMode !== 'dashboard') {
      questionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentQuestionIndex]);

  // Toggle or Re-shuffle
  const handleToggleShuffle = () => {
    if (!isShuffled) {
      setIsShuffled(true);
    } else {
      const ids = baseQuestionList.map(q => q.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setShuffledIds(ids);
      setCurrentQuestionIndex(0);
    }
  };

  const handleDisableShuffle = () => {
    setIsShuffled(false);
    setShuffledIds(null);
    setCurrentQuestionIndex(0);
  };

  // Exam countdown timer
  useEffect(() => {
    if (isExamRunning && examTimeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setExamTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isExamRunning, examTimeLeft]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextQuestion();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevQuestion();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const optNum = parseInt(e.key, 10);
        if (currentQ && optNum <= currentQ.options.length) {
          handleSelectOption(optNum);
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && currentQ && sessionAnswers[currentQ.id]) {
        e.preventDefault();
        handleNextQuestion();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, currentQuestionList, viewMode, isExamRunning, examAnswers, progress, sessionAnswers]);

  // Navigation Handlers
  const handleNextQuestion = () => {
    if (currentQuestionIndex < currentQuestionList.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (viewMode === 'review') {
      navigateTo('dashboard');
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSelectOption = (optIndex: number) => {
    if (!currentQ) return;

    if (viewMode === 'exam' && isExamRunning) {
      setExamAnswers(prev => ({
        ...prev,
        [currentQ.id]: optIndex
      }));
      return;
    }

    if (viewMode !== 'exam' && !isReviewingExam) {
      if (sessionAnswers[currentQ.id]) return;
      const isCorrect = optIndex === currentQ.correctAnswer;
      const nextProgress = recordAnswer(currentQ.id, optIndex, isCorrect, progress);
      setProgress(nextProgress);
      setSessionAnswers(prev => ({ ...prev, [currentQ.id]: { selected: optIndex, isCorrect } }));
    }
  };

  const handleToggleFav = (qId: number) => {
    const nextProgress = toggleFavorite(qId, progress);
    setProgress(nextProgress);
  };

  const handleStartExam = () => {
    const newExam = generateExam(allQuestions);
    setExamQuestions(newExam);
    setExamAnswers({});
    setExamTimeLeft(1200); // 20 phút
    setIsExamRunning(true);
    setIsReviewingExam(false);
    setCurrentQuestionIndex(0);
    setViewMode('exam');
    setIsDrawerOpen(false);
  };

  const handleSubmitExam = () => {
    if (window.confirm('Bạn có chắc chắn muốn nộp bài thi ngay bây giờ?')) {
      finishExam();
    }
  };

  const handleAutoSubmitExam = () => {
    finishExam();
  };

  const finishExam = () => {
    setIsExamRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    let failedReason: string | undefined = undefined;
    const wrongIds: number[] = [];

    examQuestions.forEach(q => {
      const userAns = examAnswers[q.id];
      if (userAns === q.correctAnswer) {
        score++;
      } else {
        wrongIds.push(q.id);
        if (q.isCritical) {
          failedReason = `Bạn trả lời sai hoặc bỏ trống Câu Điểm Liệt (Câu ${q.id})!`;
        }
      }
    });

    const isPassed = score >= 27 && !failedReason;
    if (!isPassed && !failedReason && score < 27) {
      failedReason = `Chưa đạt điểm tối thiểu (Đạt ${score}/30, yêu cầu từ 27/30).`;
    }

    if (isPassed) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    const result: ExamResult = {
      id: 'exam_' + Date.now(),
      date: Date.now(),
      score,
      total: 30,
      passed: isPassed,
      failedReason,
      durationSeconds: 1200 - examTimeLeft,
      wrongIds
    };

    // Kết quả thi cũng nuôi vòng ôn: câu sai quay lại sớm, câu đúng được giãn lịch.
    const learnedProgress = examQuestions.reduce((currentProgress, question) => {
      const selected = examAnswers[question.id] || 0;
      return recordAnswer(
        question.id,
        selected,
        selected === question.correctAnswer,
        currentProgress
      );
    }, progress);
    const nextProgress = saveExamResult(result, learnedProgress);
    setProgress(nextProgress);
    setExamResult(result);
    setIsExamResultModalOpen(true);
  };

  const handleReviewExamFromModal = () => {
    setIsExamResultModalOpen(false);
    setIsReviewingExam(true);
    setCurrentQuestionIndex(0);
  };

  // Reset Handlers (Always stays on current question/page!)
  const handleResetCurrentQuestion = () => {
    if (!currentQ) return;
    const updated = resetSingleQuestion(currentQ.id, progress);
    setProgress(updated);
    setIsResetModalOpen(false);
  };

  const handleResetCurrentList = () => {
    const ids = currentQuestionList.map(q => q.id);
    const updated = resetQuestionsList(ids, progress);
    setProgress(updated);
    setIsResetModalOpen(false);
  };

  const handleResetAllData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ tiến độ học và lịch sử thi thử không?')) {
      const clean = resetAllProgress();
      setProgress(clean);
      setIsResetModalOpen(false);
    }
  };

  // Switch navigation helper
  const navigateTo = (mode: ViewMode, chapterFilter: number | null = null, shuffle: boolean = false) => {
    setViewMode(mode);
    setActiveChapterFilter(chapterFilter);
    setIsShuffled(shuffle);
    setCurrentQuestionIndex(0);
    setIsReviewingExam(false);
    setSessionAnswers({});
    setIsDrawerOpen(false);
  };

  const startSmartReview = () => {
    setReviewQuestions(buildSmartReview(progress));
    navigateTo('review');
  };

  // Dashboard calculations
  const totalAnswered = Object.keys(progress.answeredQuestions).length;
  const correctCount = Object.values(progress.answeredQuestions).filter(a => a.isCorrect).length;
  const criticalAnsweredCorrect = allQuestions
    .filter(q => q.isCritical)
    .filter(q => progress.answeredQuestions[q.id]?.isCorrect).length;
  const totalWrongCount = Object.keys(progress.wrongCount).filter(
    id => (progress.wrongCount[Number(id)] || 0) > 0
  ).length;
  const dueReviewCount = allQuestions.filter(q => {
    const learning = progress.learning[q.id];
    return (progress.wrongCount[q.id] || 0) > 0 || (learning && learning.nextReviewAt <= Date.now());
  }).length;
  const todayKey = new Date().toLocaleDateString('en-CA');
  const answeredToday = Object.values(progress.answeredQuestions).filter(
    item => new Date(item.timestamp).toLocaleDateString('en-CA') === todayKey
  ).length;
  const overallPercent = Math.round((totalAnswered / allQuestions.length) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="app-header">
        <div className="brand-group" onClick={() => navigateTo('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <img src="/logo.svg" alt="" aria-hidden="true" />
          </div>
          <span className="brand-title">600 Câu Lý Thuyết Ô Tô</span>
        </div>

        <div className="header-actions">
          {/* Light / Dark Mode Toggle */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Reset Options Button */}
          <button
            className="icon-btn"
            onClick={() => setIsResetModalOpen(true)}
            title="Tùy chọn làm lại / đặt lại"
          >
            <RotateCcw size={18} />
          </button>

          {/* Hamburger Menu (Dấu 3 gạch) */}
          <button
            className="icon-btn"
            onClick={() => setIsDrawerOpen(true)}
            title="Menu chức năng"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Views */}
      <main>
        {/* VIEW: DASHBOARD */}
        {viewMode === 'dashboard' && (
          <div>
            {/* Hero Banner */}
            <div className="hero-banner">
              <div className="hero-orb hero-orb-one" />
              <div className="hero-orb hero-orb-two" />
              <div className="hero-content">
                <div className="hero-copy">
                  <div className="hero-badge">
                    <span className="hero-badge-dot"></span>
                    BỘ 600 CÂU LÝ THUYẾT Ô TÔ
                  </div>
                  <div className="hero-title">Mỗi ngày một ít,<br />nhớ lâu hơn một chút.</div>
                  <div className="hero-subtitle">
                    Hệ thống ưu tiên câu bạn hay sai và nhắc lại đúng thời điểm.
                  </div>
                  <button className="hero-cta" onClick={startSmartReview}>
                    <Zap size={17} fill="currentColor" />
                    {totalAnswered === 0 ? 'Bắt đầu 20 câu hôm nay' : 'Ôn nhanh hôm nay'}
                    <ChevronRight size={17} />
                  </button>
                </div>
                <div className="progress-ring" style={{ '--progress': `${overallPercent * 3.6}deg` } as CSSProperties}>
                  <div className="progress-ring-inner">
                    <strong>{overallPercent}%</strong>
                    <span>hoàn thành</span>
                  </div>
                </div>
              </div>
              <div className="hero-stats">
                <div className="stat-box">
                  <span className="stat-value">{answeredToday}<small> câu</small></span>
                  <span className="stat-label">Hôm nay</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value success-text">
                    {totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0}%
                  </span>
                  <span className="stat-label">Chính xác</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value danger-text">{criticalAnsweredCorrect}<small>/60</small></span>
                  <span className="stat-label">Điểm liệt vững</span>
                </div>
              </div>
            </div>

            <section className="today-plan" aria-label="Kế hoạch học hôm nay">
              <div className="today-plan-icon"><Brain size={23} /></div>
              <div className="today-plan-copy">
                <span className="eyebrow">Gợi ý cho bạn</span>
                <h2>{dueReviewCount > 0 ? `${dueReviewCount} câu cần củng cố` : 'Sẵn sàng học nội dung mới'}</h2>
                <p>{dueReviewCount > 0 ? 'Ôn đúng câu yếu trước, sau đó hệ thống sẽ thêm câu mới.' : 'Một phiên ngắn 10–15 phút là đủ để duy trì nhịp học.'}</p>
              </div>
              <button className="plan-button" onClick={startSmartReview} aria-label="Bắt đầu ôn tập thông minh">
                Bắt đầu <ArrowRight size={16} />
              </button>
            </section>

            {/* Quick Action Grid */}
            <div className="action-grid">
              <button type="button" className="action-card" onClick={() => navigateTo('learn', null, false)}>
                <div className="action-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <BookOpen size={20} />
                </div>
                <div className="action-card-info">
                  <div className="action-card-title">Học 600 Câu</div>
                  <div className="action-card-desc">Luyện toàn bộ câu hỏi kèm đáp án & mẹo</div>
                </div>
              </button>

              <button type="button" className="action-card" onClick={() => navigateTo('critical', null, true)}>
                <div className="action-card-icon" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                  <ShieldAlert size={20} />
                </div>
                <div className="action-card-info">
                  <div className="action-card-title">60 Điểm Liệt</div>
                  <div className="action-card-desc">Xáo trộn ngẫu nhiên • Tuyệt đối cấm sai</div>
                </div>
              </button>

              <button type="button" className="action-card" onClick={handleStartExam}>
                <div className="action-card-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}>
                  <Timer size={20} />
                </div>
                <div className="action-card-info">
                  <div className="action-card-title">Thi Thử 30 Câu</div>
                  <div className="action-card-desc">Đề chuẩn 30 câu / 20 phút bấm giờ</div>
                </div>
              </button>

              <button type="button" className="action-card" onClick={() => navigateTo('wrong', null, true)}>
                <div className="action-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <XCircle size={20} />
                </div>
                <div className="action-card-info">
                  <div className="action-card-title">
                    Ôn Câu Sai
                    {totalWrongCount > 0 && <span className="card-badge-count">{totalWrongCount}</span>}
                  </div>
                  <div className="action-card-desc">Khắc phục các câu đã làm nhầm</div>
                </div>
              </button>
            </div>

            {/* Chapters Progress */}
            <div className="section-title section-heading-row">
              <BookOpen size={18} color="#6366f1" />
              <span>Tiến độ theo chương</span>
              <span className="section-meta">{totalAnswered}/600 câu</span>
            </div>
            <div className="chapter-list">
              {[
                { id: 1, name: 'Chương 1: Quy tắc giao thông đường bộ', count: 180 },
                { id: 2, name: 'Chương 2: Văn hóa & đạo đức người lái xe', count: 25 },
                { id: 3, name: 'Chương 3: Kỹ thuật lái xe ô tô', count: 58 },
                { id: 4, name: 'Chương 4: Cấu tạo & sửa chữa xe ô tô', count: 37 },
                { id: 5, name: 'Chương 5: Hệ thống biển báo hiệu đường bộ', count: 185 },
                { id: 6, name: 'Chương 6: Các thế sa hình & tình huống', count: 115 }
              ].map(ch => {
                const chapterQuestions = allQuestions.filter(q => q.chapter === ch.id);
                const answeredInCh = chapterQuestions.filter(q => progress.answeredQuestions[q.id]).length;
                return (
                  <button
                    type="button"
                    key={ch.id}
                    className="chapter-item"
                    onClick={() => navigateTo('learn', ch.id, false)}
                  >
                    <div className="chapter-left">
                      <div className="chapter-num">{ch.id}</div>
                      <div className="chapter-info">
                        <div className="chapter-name">{ch.name}</div>
                        <div className="chapter-sub">{ch.count} câu hỏi</div>
                      </div>
                    </div>
                    <div className="chapter-progress-wrap">
                      <div className="chapter-progress-track">
                        <span style={{ width: `${Math.round((answeredInCh / ch.count) * 100)}%` }} />
                      </div>
                      <div className="chapter-progress-pill">
                        {answeredInCh}/{ch.count}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Exam History */}
            {progress.examHistory.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div className="section-title">
                  <Trophy size={18} color="#fbbf24" />
                  Lịch Sử Thi Thử Gần Đây
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {progress.examHistory.slice(0, 5).map(res => (
                    <div
                      key={res.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: res.passed ? 'var(--success)' : 'var(--danger)', fontSize: '0.92rem' }}>
                          {res.passed ? '🎉 ĐẠT' : '❌ CHƯA ĐẠT'}: {res.score}/30 điểm
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                          Thời gian làm: {Math.floor(res.durationSeconds / 60)}p {res.durationSeconds % 60}s • {new Date(res.date).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: res.passed ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: res.passed ? 'var(--success)' : 'var(--danger)'
                        }}
                      >
                        {res.score >= 27 ? 'Đạt điểm' : 'Dưới 27'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: STUDY / CRITICAL / WRONG / EXAM REVIEW */}
        {(viewMode === 'review' || viewMode === 'learn' || viewMode === 'critical' || viewMode === 'wrong' || viewMode === 'favorites' || (viewMode === 'exam' && !isExamRunning)) && (
          <div ref={questionTopRef} className="study-view">
            {currentQuestionList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 16px' }}>
                <CheckCircle2 size={50} color="#10b981" style={{ marginBottom: '12px' }} />
                <h3 style={{ color: 'var(--text-title)', marginBottom: '6px' }}>Không có câu hỏi nào!</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '18px', fontSize: '0.9rem' }}>
                  {viewMode === 'wrong'
                    ? 'Bạn chưa làm sai câu nào hoặc đã hoàn thành ôn tập toàn bộ câu sai!'
                    : 'Danh sách này hiện đang trống.'}
                </p>
                <button
                  className="nav-btn nav-btn-primary"
                  style={{ margin: '0 auto' }}
                  onClick={() => navigateTo('dashboard')}
                >
                  Về trang chủ
                </button>
              </div>
            ) : currentQ ? (
              <div className="question-stage" key={currentQ.id}>
                <div className="study-toolbar">
                  <div>
                    <span className="eyebrow">
                      {viewMode === 'review' ? 'Ôn tập thông minh' : isReviewingExam ? 'Xem lại bài thi' : 'Phiên học đang diễn ra'}
                    </span>
                    <strong>{currentQuestionIndex + 1} / {currentQuestionList.length}</strong>
                  </div>
                  <div className="study-progress-track" aria-label={`Tiến độ ${currentQuestionIndex + 1} trên ${currentQuestionList.length}`}>
                    <span style={{ width: `${((currentQuestionIndex + 1) / currentQuestionList.length) * 100}%` }} />
                  </div>
                </div>
                {/* Question Card */}
                <div className="question-card">
                  <div className="question-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                      <span className="badge-tag badge-chapter">
                        Câu {currentQuestionIndex + 1} / {currentQuestionList.length} (ID #{currentQ.id})
                      </span>
                      {currentQ.isCritical && (
                        <span className="badge-tag badge-critical">
                          <AlertTriangle size={11} /> ĐIỂM LIỆT
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {/* Shuffle Toggle Button */}
                      <button
                        className={`icon-btn ${isShuffled ? 'active' : ''}`}
                        onClick={handleToggleShuffle}
                        title={isShuffled ? 'Đang xáo trộn (Bấm để đảo lại ngẫu nhiên)' : 'Bật chế độ xáo trộn ngẫu nhiên'}
                      >
                        <Shuffle size={17} />
                      </button>

                      {/* Favorite Button */}
                      <button
                        className="icon-btn"
                        onClick={() => handleToggleFav(currentQ.id)}
                        title="Đánh dấu câu quan trọng"
                      >
                        <Star
                          size={17}
                          color={progress.favorites.includes(currentQ.id) ? '#fbbf24' : 'currentColor'}
                          fill={progress.favorites.includes(currentQ.id) ? '#fbbf24' : 'none'}
                        />
                      </button>

                      {/* Grid Button */}
                      <button
                        className="icon-btn"
                        onClick={() => setIsGridModalOpen(true)}
                        title="Xem danh sách câu"
                      >
                        <Grid size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Shuffle status bar banner if active */}
                  {isShuffled && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      color: 'var(--primary)',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <Shuffle size={13} />
                        <span>Chế độ xáo trộn đang BẬT (ngẫu nhiên)</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleToggleShuffle}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                          Đảo lại
                        </button>
                        <button
                          onClick={handleDisableShuffle}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          Tắt
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Question Content */}
                  <div className="question-text">{currentQ.question}</div>

                  {/* Question Image (if any) */}
                  {currentQ.image && (
                    <div className="question-image-box">
                      <img
                        src={currentQ.image}
                        alt={`Minh họa câu ${currentQ.id}`}
                        loading="eager"
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="options-list">
                    {currentQ.options.map((opt, idx) => {
                      const optNum = idx + 1;
                      const examSelected = examAnswers[currentQ.id];
                      const userState = isReviewingExam
                        ? (examSelected ? { selected: examSelected, isCorrect: examSelected === currentQ.correctAnswer } : undefined)
                        : sessionAnswers[currentQ.id];
                      const isSelected = userState?.selected === optNum;
                      const hasAnswered = !!userState;
                      const isCorrectAnswer = optNum === currentQ.correctAnswer;

                      let btnClass = 'option-btn';
                      if (hasAnswered) {
                        if (isSelected && isCorrectAnswer) {
                          btnClass += ' selected-correct';
                        } else if (isSelected && !isCorrectAnswer) {
                          btnClass += ' selected-wrong';
                        } else if (!isSelected && isCorrectAnswer) {
                          btnClass += ' reveal-correct';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          className={btnClass}
                          onClick={() => handleSelectOption(optNum)}
                          disabled={hasAnswered || isReviewingExam}
                        >
                          <div className="option-letter">{optNum}</div>
                          <div style={{ flex: 1 }}>{opt}</div>
                          {hasAnswered && isCorrectAnswer && (
                            <Check size={18} color="#10b981" />
                          )}
                          {hasAnswered && isSelected && !isCorrectAnswer && (
                            <X size={18} color="#f43f5e" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!sessionAnswers[currentQ.id] && !isReviewingExam && (
                    <div className="recall-hint">
                      <Brain size={15} /> Tự chọn trước khi xem mẹo — dùng phím 1–4 để trả lời
                    </div>
                  )}

                  {(sessionAnswers[currentQ.id] || isReviewingExam) && (
                    <div className={`answer-feedback ${(sessionAnswers[currentQ.id]?.isCorrect || (isReviewingExam && examAnswers[currentQ.id] === currentQ.correctAnswer)) ? 'correct' : 'wrong'}`}>
                      {(sessionAnswers[currentQ.id]?.isCorrect || (isReviewingExam && examAnswers[currentQ.id] === currentQ.correctAnswer))
                        ? <><CheckCircle2 size={18} /><span><strong>Chính xác!</strong> Bạn đang ghi nhớ rất tốt.</span></>
                        : <><Target size={18} /><span><strong>Chưa đúng.</strong> Đọc mẹo bên dưới rồi thử nhớ lại ý chính.</span></>}
                    </div>
                  )}

                  {/* Tip & Explanation Box — chỉ hiện sau khi tự trả lời */}
                  {(sessionAnswers[currentQ.id] || isReviewingExam) && (() => {
                    const tip = getTipForQuestion(currentQ);
                    return (
                      <div className="tip-container">
                        <div className="tip-header">
                          <Lightbulb size={16} />
                          <span>{tip.title}</span>
                          {tip.ruleTag && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              [{tip.ruleTag}]
                            </span>
                          )}
                        </div>
                        <div className="tip-short">💡 {tip.shortTip}</div>
                        <div className="tip-body">{tip.explanation}</div>

                        {currentQ.explanation && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(245, 158, 11, 0.25)', fontSize: '0.8rem', color: 'var(--text-body)' }}>
                            <strong>Chú thích:</strong> {currentQ.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom Navigation Controls */}
                <div className="quiz-nav-bar">
                  <button
                    className="nav-btn"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft size={16} /> Câu trước
                  </button>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {currentQuestionIndex + 1} / {currentQuestionList.length}
                  </div>

                  <button
                    className="nav-btn nav-btn-primary"
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === currentQuestionList.length - 1 && viewMode !== 'review'}
                  >
                    {currentQuestionIndex === currentQuestionList.length - 1 && viewMode === 'review' ? 'Hoàn tất' : 'Câu sau'} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* VIEW: EXAM RUNNING */}
        {viewMode === 'exam' && isExamRunning && currentQ && (
          <div>
            {/* Exam HUD */}
            <div className="exam-hud">
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Đề Thi Thử (30 câu)
                </span>
                <div style={{ fontWeight: 700, color: 'var(--text-title)', fontSize: '0.92rem' }}>
                  Đã làm: {Object.keys(examAnswers).length} / 30 câu
                </div>
              </div>

              <div className={`exam-timer ${examTimeLeft < 180 ? 'warning' : ''}`}>
                <Timer size={19} />
                <span>{formatTime(examTimeLeft)}</span>
              </div>

              <button
                className="nav-btn nav-btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.84rem' }}
                onClick={handleSubmitExam}
              >
                Nộp bài
              </button>
            </div>

            {/* Question Card */}
            <div className="question-card">
              <div className="question-header">
                <span className="badge-tag badge-chapter">
                  Câu {currentQuestionIndex + 1} / 30
                </span>

                <button
                  className="icon-btn"
                  onClick={() => setIsGridModalOpen(true)}
                  title="Danh sách câu"
                >
                  <Grid size={17} />
                </button>
              </div>

              <div className="question-text">{currentQ.question}</div>

              {currentQ.image && (
                <div className="question-image-box">
                  <img src={currentQ.image} alt={`Câu ${currentQ.id}`} />
                </div>
              )}

              <div className="options-list">
                {currentQ.options.map((opt, idx) => {
                  const optNum = idx + 1;
                  const isSelected = examAnswers[currentQ.id] === optNum;

                  return (
                    <button
                      key={idx}
                      className={`option-btn ${isSelected ? 'selected-correct' : ''}`}
                      onClick={() => handleSelectOption(optNum)}
                    >
                      <div className="option-letter">{optNum}</div>
                      <div style={{ flex: 1 }}>{opt}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav buttons */}
            <div className="quiz-nav-bar">
              <button
                className="nav-btn"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft size={16} /> Câu trước
              </button>

              <button
                className="nav-btn"
                onClick={() => setIsGridModalOpen(true)}
              >
                Bảng 30 câu
              </button>

              <button
                className="nav-btn nav-btn-primary"
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === examQuestions.length - 1}
              >
                Câu sau <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* VIEW: HANDBOOK TIPS */}
        {viewMode === 'tips' && (
          <div>
            <div className="section-title">
              <Sparkles size={18} color="#fbbf24" />
              Cẩm Nang Mẹo Thi Lý Thuyết Ô Tô
            </div>

            {HANDBOOK_TIPS.map((cat, idx) => (
              <div key={idx} className="handbook-card">
                <div className="handbook-cat-title" style={{ color: cat.color }}>
                  {cat.category}
                </div>
                {cat.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="handbook-item">
                    <div className="handbook-rule">{item.rule}</div>
                    <div className="handbook-detail">{item.detail}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Điều hướng chính">
        <button className={viewMode === 'dashboard' ? 'active' : ''} onClick={() => navigateTo('dashboard')}>
          <Home size={19} /><span>Tổng quan</span>
        </button>
        <button className={viewMode === 'review' ? 'active' : ''} onClick={startSmartReview}>
          <Brain size={19} /><span>Ôn nhanh</span>
        </button>
        <button className={viewMode === 'exam' ? 'active' : ''} onClick={handleStartExam}>
          <Timer size={19} /><span>Thi thử</span>
        </button>
        <button className={viewMode === 'tips' ? 'active' : ''} onClick={() => navigateTo('tips')}>
          <Lightbulb size={19} /><span>Mẹo nhớ</span>
        </button>
      </nav>

      {/* Slide-out Drawer Menu (Hamburger Menu) */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img className="drawer-logo" src="/logo.svg" alt="" aria-hidden="true" />
                <span className="drawer-title">Danh Mục Ôn Tập</span>
              </div>
              <button className="icon-btn" onClick={() => setIsDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <button
                className={`drawer-menu-item ${viewMode === 'dashboard' ? 'active' : ''}`}
                onClick={() => navigateTo('dashboard')}
              >
                <Home size={18} />
                <span>Tổng quan</span>
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'review' ? 'active' : ''}`}
                onClick={startSmartReview}
              >
                <Brain size={18} />
                <span>Ôn nhanh hôm nay</span>
                {dueReviewCount > 0 && <span className="drawer-menu-badge">{dueReviewCount}</span>}
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'learn' && activeChapterFilter === null && !isShuffled ? 'active' : ''}`}
                onClick={() => navigateTo('learn', null, false)}
              >
                <BookOpen size={18} />
                <span>Toàn bộ 600 câu (Thứ tự)</span>
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'learn' && activeChapterFilter === null && isShuffled ? 'active' : ''}`}
                onClick={() => navigateTo('learn', null, true)}
              >
                <Shuffle size={18} />
                <span>Xáo trộn 600 câu</span>
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'critical' ? 'active' : ''}`}
                onClick={() => navigateTo('critical', null, false)}
              >
                <ShieldAlert size={18} />
                <span>60 Câu điểm liệt</span>
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'exam' ? 'active' : ''}`}
                onClick={handleStartExam}
              >
                <Timer size={18} />
                <span>Thi thử 30 câu</span>
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'tips' ? 'active' : ''}`}
                onClick={() => navigateTo('tips')}
              >
                <Lightbulb size={18} />
                <span>Cẩm nang Mẹo thi</span>
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'wrong' ? 'active' : ''}`}
                onClick={() => navigateTo('wrong', null, true)}
              >
                <XCircle size={18} />
                <span>Ôn các câu làm sai</span>
                {totalWrongCount > 0 && (
                  <span className="drawer-menu-badge">{totalWrongCount}</span>
                )}
              </button>

              <button
                className={`drawer-menu-item ${viewMode === 'favorites' ? 'active' : ''}`}
                onClick={() => navigateTo('favorites')}
              >
                <Star size={18} />
                <span>Câu đã đánh dấu</span>
                {progress.favorites.length > 0 && (
                  <span className="drawer-menu-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                    {progress.favorites.length}
                  </span>
                )}
              </button>

              <div style={{ margin: '10px 0', borderTop: '1px solid var(--border-subtle)' }} />

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', padding: '0 8px 6px 8px', textTransform: 'uppercase' }}>
                Học theo chủ đề / chương
              </div>

              {[
                { id: 1, name: 'Chương 1: Quy tắc giao thông', count: 180 },
                { id: 2, name: 'Chương 2: Đạo đức người lái', count: 25 },
                { id: 3, name: 'Chương 3: Kỹ thuật lái xe', count: 58 },
                { id: 4, name: 'Chương 4: Cấu tạo & sửa chữa', count: 37 },
                { id: 5, name: 'Chương 5: Biển báo hiệu', count: 185 },
                { id: 6, name: 'Chương 6: Sa hình & tình huống', count: 115 }
              ].map(ch => (
                <button
                  key={ch.id}
                  className={`drawer-menu-item ${viewMode === 'learn' && activeChapterFilter === ch.id ? 'active' : ''}`}
                  onClick={() => navigateTo('learn', ch.id, isShuffled)}
                  style={{ fontSize: '0.85rem', padding: '9px 12px' }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', width: '18px' }}>
                    {ch.id}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ch.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="drawer-footer">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Chế độ giao diện:
              </span>
              <button
                className="icon-btn"
                onClick={toggleTheme}
                title="Đổi giao diện Sáng / Tối"
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Granular Reset Options Modal (Never kicks user out!) */}
      {isResetModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResetModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ color: 'var(--text-title)', fontSize: '1.05rem', fontWeight: 800 }}>
                Tùy Chọn Làm Lại / Đặt Lại
              </h3>
              <button className="icon-btn" onClick={() => setIsResetModalOpen(false)}>
                <X size={17} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '14px', lineHeight: 1.4 }}>
              Bạn muốn làm lại câu đang xem, danh sách hiện tại hay xóa toàn bộ? (Vẫn ở lại màn hình hiện tại).
            </p>

            {/* Option 1: Reset current question only */}
            {currentQ && (
              <button className="reset-option-card" onClick={handleResetCurrentQuestion}>
                <RefreshCw size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
                <div>
                  <div className="reset-option-title">Làm lại câu hiện tại (Câu #{currentQ.id})</div>
                  <div className="reset-option-desc">Xóa kết quả đã chọn để trả lời lại ngay câu này</div>
                </div>
              </button>
            )}

            {/* Option 2: Reset current chapter/filtered list */}
            {currentQuestionList.length > 1 && (
              <button className="reset-option-card" onClick={handleResetCurrentList}>
                <FolderSync size={20} color="#6366f1" style={{ flexShrink: 0 }} />
                <div>
                  <div className="reset-option-title">Làm lại danh sách hiện tại ({currentQuestionList.length} câu)</div>
                  <div className="reset-option-desc">Xóa kết quả của tất cả câu hỏi trong phần đang học</div>
                </div>
              </button>
            )}

            {/* Option 3: Reset everything */}
            <button className="reset-option-card" onClick={handleResetAllData} style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
              <Trash2 size={20} color="#f43f5e" style={{ flexShrink: 0 }} />
              <div>
                <div className="reset-option-title" style={{ color: '#fb7185' }}>Xóa sạch toàn bộ tiến độ</div>
                <div className="reset-option-desc">Đặt lại 600 câu, điểm liệt và lịch sử thi thử về ban đầu</div>
              </div>
            </button>

            <button
              className="nav-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
              onClick={() => setIsResetModalOpen(false)}
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* Question Grid Modal */}
      {isGridModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGridModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ color: 'var(--text-title)', fontSize: '1.05rem', fontWeight: 800 }}>
                Danh Sách Câu Hỏi ({currentQuestionList.length} câu)
              </h3>
              <button className="icon-btn" onClick={() => setIsGridModalOpen(false)}>
                <X size={17} />
              </button>
            </div>

            <div className="question-grid">
              {currentQuestionList.map((q, idx) => {
                let cellClass = 'grid-cell';
                if (idx === currentQuestionIndex) {
                  cellClass += ' current';
                }

                if (viewMode === 'exam' && isExamRunning) {
                  if (examAnswers[q.id]) {
                    cellClass += ' marked-exam';
                  }
                } else {
                  const state = progress.answeredQuestions[q.id];
                  if (state) {
                    cellClass += state.isCorrect ? ' answered-correct' : ' answered-wrong';
                  }
                }

                return (
                  <div
                    key={q.id}
                    className={cellClass}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setIsGridModalOpen(false);
                    }}
                  >
                    {idx + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exam Result Modal */}
      {isExamResultModalOpen && examResult && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>
              {examResult.passed ? '🎉' : '❌'}
            </div>
            <h2 style={{ color: examResult.passed ? 'var(--success)' : 'var(--danger)', marginBottom: '6px', fontSize: '1.3rem' }}>
              {examResult.passed ? 'CHÚC MỪNG BẠN ĐÃ ĐẠT!' : 'RẤT TIẾC, CHƯA ĐẠT!'}
            </h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-title)', marginBottom: '10px' }}>
              {examResult.score} / 30 điểm
            </div>

            {examResult.failedReason && (
              <div style={{ padding: '10px 12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: '#fb7185', fontSize: '0.84rem', marginBottom: '16px', lineHeight: 1.4 }}>
                ⚠️ {examResult.failedReason}
              </div>
            )}

            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
              Thời gian làm: {Math.floor(examResult.durationSeconds / 60)} phút {examResult.durationSeconds % 60} giây
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                className="nav-btn"
                onClick={handleReviewExamFromModal}
              >
                Xem lại bài thi
              </button>
              <button
                className="nav-btn nav-btn-primary"
                onClick={handleStartExam}
              >
                Thi lại đề khác
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
