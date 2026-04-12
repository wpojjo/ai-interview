"use client";

import { useState, useRef, useEffect } from "react";
import {
  Message,
  Difficulty,
  AgentId,
  AGENTS,
  AGENT_ORDER,
  TOTAL_AGENTS,
  MAX_FOLLOWUPS,
  getFirstQuestion,
} from "@/lib/interview";
import DifficultySelect from "@/components/DifficultySelect";
import DebateLoading, { type DebateResultData } from "@/components/DebateLoading";
import DebateResult from "@/components/DebateResult";

const ANSWER_TIME_LIMIT = 80;

type Phase = "selecting" | "interviewing" | "debating" | "done";

async function fetchQuestion(
  messages: Message[],
  agentId: AgentId,
  isFollowUpRequest: boolean,
  difficulty: Difficulty,
): Promise<{ question?: string; hint?: string; followUp?: boolean }> {
  const res = await fetch("/api/interview/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, agentId, isFollowUpRequest, difficulty }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "질문 생성에 실패했습니다");
  return data;
}

async function startDebate(
  messages: Message[],
  difficulty: Difficulty,
): Promise<string> {
  const res = await fetch("/api/interview/debate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, difficulty }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "토론을 시작할 수 없습니다");
  return data.sessionId as string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const AGENT_META: Record<AgentId, { color: string; bg: string; bgColor: string; name: string }> = {
  organization: {
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/40",
    bgColor: "e9d5ff",
    name: "면접관 1",
  },
  logic: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/40",
    bgColor: "bfdbfe",
    name: "면접관 2",
  },
  technical: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/40",
    bgColor: "bbf7d0",
    name: "면접관 3",
  },
};

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function makeAvatarUrl(seed: string, bgColor: string) {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=${bgColor}`;
}

function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

const AGENT_RING: Record<AgentId, string> = {
  organization: "ring-purple-400 dark:ring-purple-500",
  logic: "ring-blue-400 dark:ring-blue-500",
  technical: "ring-green-400 dark:ring-green-500",
};

const AGENT_GLOW: Record<AgentId, string> = {
  organization: "shadow-[0_0_20px_4px_rgba(168,85,247,0.35)]",
  logic: "shadow-[0_0_20px_4px_rgba(59,130,246,0.35)]",
  technical: "shadow-[0_0_20px_4px_rgba(34,197,94,0.35)]",
};

function InterviewerPanel({
  agentIndex,
  isLoading,
  isSpeaking,
  avatarSeeds,
}: {
  agentIndex: number;
  isLoading: boolean;
  isSpeaking: boolean;
  avatarSeeds: Record<AgentId, string>;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {AGENT_ORDER.map((aid, i) => {
        const meta = AGENT_META[aid];
        const isActive = i === agentIndex;
        const isDone = i < agentIndex;
        const isPending = i > agentIndex;
        const avatarUrl = makeAvatarUrl(avatarSeeds[aid], meta.bgColor);

        return (
          <div
            key={aid}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 ${
              isActive
                ? "bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-md"
                : isDone
                  ? "bg-gray-50 dark:bg-slate-800/50 opacity-50"
                  : "bg-gray-50 dark:bg-slate-800/30 opacity-40"
            }`}
          >
            {/* 아바타 */}
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-full overflow-hidden border-4 transition-all duration-300 ${
                  isActive
                    ? `border-white dark:border-slate-700 ring-4 ${AGENT_RING[aid]} ${AGENT_GLOW[aid]}`
                    : "border-white dark:border-slate-700"
                }`}
              >
                <img
                  src={avatarUrl}
                  alt={meta.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${isPending ? "grayscale" : ""}`}
                />
              </div>
              {/* 발언 중 표시 */}
              {isActive && isSpeaking && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    aid === "organization" ? "bg-purple-400" : aid === "logic" ? "bg-blue-400" : "bg-green-400"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-4 w-4 ${
                    aid === "organization" ? "bg-purple-500" : aid === "logic" ? "bg-blue-500" : "bg-green-500"
                  }`} />
                </span>
              )}
              {/* 완료 표시 */}
              {isDone && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                  ✓
                </span>
              )}
              {/* 로딩 표시 */}
              {isActive && isLoading && (
                <span className="absolute -bottom-1 -right-1 flex gap-0.5 bg-white dark:bg-slate-800 rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 dark:border-slate-700">
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>

            {/* 이름 */}
            <div className="text-center">
              <p className={`text-xs font-semibold ${isActive ? meta.color : "text-gray-400 dark:text-slate-500"}`}>
                {meta.name}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestionBubble({ agentId, question }: { agentId: AgentId; question: string }) {
  const { displayed, done } = useTypewriter(question);
  const agentIdx = AGENT_ORDER.indexOf(agentId);
  const triangleLeft = agentIdx === 0 ? "left-[16.6%]" : agentIdx === 1 ? "left-1/2" : "left-[83.3%]";

  return (
    <div className="relative mt-1">
      {/* 말풍선 꼭지 */}
      <div className={`absolute -top-2.5 ${triangleLeft} -translate-x-1/2 w-5 h-5 rotate-45 bg-white dark:bg-slate-800 border-t border-l border-gray-100 dark:border-slate-700`} />
      <div className="card p-5 relative">
        <p className="text-gray-900 dark:text-slate-100 text-[15px] leading-relaxed">
          {displayed}
          {!done && (
            <span className="inline-block w-0.5 h-4 bg-gray-400 dark:bg-slate-400 ml-0.5 animate-pulse align-middle" />
          )}
        </p>
      </div>
    </div>
  );
}

export default function InterviewSession({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>("selecting");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [agentIndex, setAgentIndex] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [avatarSeeds, setAvatarSeeds] = useState<Record<AgentId, string>>({
    organization: "organization",
    logic: "logic",
    technical: "technical",
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentHint, setCurrentHint] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(ANSWER_TIME_LIMIT);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [debateResult, setDebateResult] = useState<DebateResultData | null>(null);
  const [debateError, setDebateError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  function handleDifficultySelect(d: Difficulty) {
    setDifficulty(d);
    setAvatarSeeds({ organization: randomSeed(), logic: randomSeed(), technical: randomSeed() });
    setMessages([{ role: "interviewer", content: getFirstQuestion(name), agentId: "organization" }]);
    setCurrentHint("지원자의 기본 배경과 이 회사·직무에 지원한 이유를 파악하는 질문입니다. 단순한 경력 나열보다는 지원 동기의 진정성과 이 포지션과의 연관성을 구체적으로 전달하세요.");
    setHintVisible(false);
    setAgentIndex(0);
    setFollowUpCount(0);
    setPhase("interviewing");
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, phase]);

  useEffect(() => {
    setTimeLeft(ANSWER_TIME_LIMIT);
  }, [messages.length]);

  useEffect(() => {
    if (phase !== "interviewing" || isLoading || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isLoading, phase]);

  // 30초 이하 남으면 힌트 자동 표시
  useEffect(() => {
    if (timeLeft === 30 && currentHint && !hintVisible) {
      setHintVisible(true);
    }
  }, [timeLeft, currentHint, hintVisible]);

  async function handleSubmit() {
    const trimmed = answer.trim();
    if (!trimmed || isLoading) return;

    const currentAgentId = AGENT_ORDER[agentIndex];
    const updatedMessages: Message[] = [
      ...messages,
      { role: "candidate", content: trimmed },
    ];
    setMessages(updatedMessages);
    setAnswer("");
    setIsLoading(true);
    setError("");

    try {
      const maxFollowUps = MAX_FOLLOWUPS[difficulty];
      const canFollowUp = followUpCount < maxFollowUps;

      if (canFollowUp) {
        const result = await fetchQuestion(updatedMessages, currentAgentId, true, difficulty);
        if (result.followUp === false) {
          await advanceToNextAgent(updatedMessages);
        } else if (result.question) {
          setMessages([
            ...updatedMessages,
            { role: "interviewer", content: result.question, agentId: currentAgentId },
          ]);
          setCurrentHint(result.hint ?? "");
          setHintVisible(false);
          setFollowUpCount((c) => c + 1);
        }
      } else {
        await advanceToNextAgent(updatedMessages);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "질문 생성에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }

  async function advanceToNextAgent(currentMessages: Message[]) {
    const nextAgentIndex = agentIndex + 1;

    if (nextAgentIndex >= TOTAL_AGENTS) {
      // 면접 종료 → 토론 시작
      setPhase("debating");
      try {
        const sid = await startDebate(currentMessages, difficulty);
        setSessionId(sid);
      } catch (e: unknown) {
        setDebateError(e instanceof Error ? e.message : "토론을 시작할 수 없습니다");
      }
      return;
    }

    const nextAgentId = AGENT_ORDER[nextAgentIndex];
    const result = await fetchQuestion(currentMessages, nextAgentId, false, difficulty);
    if (result.question) {
      setMessages([
        ...currentMessages,
        { role: "interviewer", content: result.question, agentId: nextAgentId },
      ]);
      setCurrentHint(result.hint ?? "");
      setHintVisible(false);
      setAgentIndex(nextAgentIndex);
      setFollowUpCount(0);
    }
  }

  function handleRestart() {
    setPhase("selecting");
    setMessages([]);
    setAgentIndex(0);
    setFollowUpCount(0);
    setAnswer("");
    setTimeLeft(ANSWER_TIME_LIMIT);
    setError("");
    setCurrentHint("");
    setHintVisible(false);
    setSessionId(null);
    setDebateResult(null);
    setDebateError("");
  }

  // 난이도 선택
  if (phase === "selecting") {
    return <DifficultySelect onSelect={handleDifficultySelect} />;
  }

  // 토론 중 or 결과 화면 (DebateLoading은 항상 마운트 유지 — 뒤로가기 시 상태 보존)
  if (phase === "debating" || phase === "done") {
    if (debateError) {
      return (
        <div className="card flex flex-col items-center justify-center py-16 px-6 space-y-4 text-center">
          <p className="text-red-500 text-sm">{debateError}</p>
          <button onClick={handleRestart} className="btn-primary">
            다시 연습하기
          </button>
        </div>
      );
    }

    if (!sessionId) {
      return (
        <div className="card flex flex-col items-center justify-center py-20 px-6 space-y-4 text-center">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-gray-600 dark:text-slate-400 font-medium">토론을 시작하는 중...</p>
        </div>
      );
    }

    return (
      <>
        {/* 결과 화면일 때 DebateLoading을 숨김 (마운트는 유지 — 뒤로가기 상태 보존) */}
        <div className={phase === "done" ? "hidden" : ""}>
          <DebateLoading
            sessionId={sessionId}
            avatarSeeds={avatarSeeds}
            onDone={(result) => {
              setDebateResult(result);
              setPhase("done");
            }}
            onError={(msg) => setDebateError(msg)}
          />
        </div>

        {/* 결과 화면 */}
        {phase === "done" && debateResult && (
          <DebateResult
            finalScore={debateResult.finalScore}
            agentEvaluations={debateResult.agentEvaluations}
            finalFeedback={debateResult.finalFeedback}
            debateSummary={debateResult.debateSummary}
            improvementTips={debateResult.improvementTips}
            onRestart={handleRestart}
            onBack={() => setPhase("debating")}
          />
        )}
      </>
    );
  }

  // 면접 진행
  const lastInterviewerIdx = messages.reduce((acc, m, i) => (m.role === "interviewer" ? i : acc), -1);
  const isAnswered = messages[messages.length - 1]?.role === "candidate";
  const currentQuestion = isAnswered ? "" : (messages[lastInterviewerIdx]?.content ?? "");
  const currentQuestionAgentId = isAnswered ? undefined : messages[lastInterviewerIdx]?.agentId;

  // 이전 Q&A 교환 (현재 질문 제외)
  const historyPairs: { question: string; agentId: AgentId; answer?: string }[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "interviewer") {
      const next = messages[i + 1];
      if (next?.role === "candidate") {
        historyPairs.push({ question: m.content, agentId: m.agentId!, answer: next.content });
        i += 2;
      } else {
        // 현재 질문(답변 전) — 패널에서 표시하므로 히스토리에 포함 안 함
        i++;
      }
    } else {
      i++;
    }
  }

  const isTimeWarning = timeLeft <= 30 && timeLeft > 0;
  const isTimeUp = timeLeft === 0;
  const isSpeaking = !!currentQuestion && !isLoading;

  return (
    <div className="space-y-4">
      {/* 면접관 패널 */}
      <InterviewerPanel agentIndex={agentIndex} isLoading={isLoading} isSpeaking={isSpeaking} avatarSeeds={avatarSeeds} />

      {/* 현재 질문 말풍선 */}
      {currentQuestion && currentQuestionAgentId && (
        <div className="space-y-2">
          <QuestionBubble agentId={currentQuestionAgentId} question={currentQuestion} />
          {/* 힌트 버튼 + 카드 */}
          {currentHint && (
            <div>
              {!hintVisible && (
                <button
                  onClick={() => setHintVisible(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors px-1"
                >
                  <span>💡</span>
                  <span>힌트 보기</span>
                </button>
              )}
              {hintVisible && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 flex items-start gap-2">
                  <span className="text-amber-500 text-sm shrink-0 mt-0.5">💡</span>
                  <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">{currentHint}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 이전 대화 기록 */}
      {historyPairs.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 dark:text-slate-500 cursor-pointer select-none list-none flex items-center gap-1 px-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            이전 대화 {historyPairs.length}개
          </summary>
          <div className="mt-2 space-y-3 pl-1">
            {historyPairs.map((pair, idx) => {
              const pairMeta = AGENT_META[pair.agentId];
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5">
                      <img src={makeAvatarUrl(avatarSeeds[pair.agentId], pairMeta.bgColor)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 dark:text-slate-300 leading-relaxed shadow-card flex-1">
                      {pair.question}
                    </div>
                  </div>
                  {pair.answer && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed shadow-sm">
                        {pair.answer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* 오류 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline ml-3"
          >
            재시도
          </button>
        </div>
      )}

      {/* 시간 초과 */}
      {isTimeUp && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-center">
          <p className="text-red-600 dark:text-red-400 text-sm font-semibold">
            ⏰ 시간이 초과됐습니다. 빠르게 답변을 마무리해주세요!
          </p>
        </div>
      )}

      {/* 답변 입력 */}
      <div className="card p-4 space-y-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
          placeholder="답변을 입력하세요 (Ctrl+Enter로 제출)"
          disabled={isLoading}
          rows={4}
          className="w-full resize-none border-0 outline-none text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 bg-transparent disabled:opacity-50"
        />
        <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-slate-700">
          <span
            className={`text-xs font-medium tabular-nums ${
              isTimeUp
                ? "text-red-500"
                : isTimeWarning
                  ? "text-orange-500"
                  : "text-gray-400 dark:text-slate-500"
            }`}
          >
            {isTimeUp ? "시간 초과" : formatTime(timeLeft)}
          </span>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !answer.trim()}
            className="btn-primary py-2 px-5"
          >
            제출 →
          </button>
        </div>
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
