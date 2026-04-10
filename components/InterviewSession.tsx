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
): Promise<{ question?: string; followUp?: boolean }> {
  const res = await fetch("/api/interview/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, agentId, isFollowUpRequest }),
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

function AgentBadge({ agentId }: { agentId: AgentId }) {
  const colorMap: Record<AgentId, string> = {
    organization: "text-purple-600 dark:text-purple-400",
    logic: "text-blue-600 dark:text-blue-400",
    technical: "text-green-600 dark:text-green-400",
  };
  return (
    <span className={`text-xs font-semibold ${colorMap[agentId]}`}>
      {AGENTS[agentId].label}
    </span>
  );
}

export default function InterviewSession({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>("selecting");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [agentIndex, setAgentIndex] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
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
    setMessages([{ role: "interviewer", content: getFirstQuestion(name), agentId: "organization" }]);
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
        const result = await fetchQuestion(updatedMessages, currentAgentId, true);
        if (result.followUp === false) {
          await advanceToNextAgent(updatedMessages);
        } else if (result.question) {
          setMessages([
            ...updatedMessages,
            { role: "interviewer", content: result.question, agentId: currentAgentId },
          ]);
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
    const result = await fetchQuestion(currentMessages, nextAgentId, false);
    if (result.question) {
      setMessages([
        ...currentMessages,
        { role: "interviewer", content: result.question, agentId: nextAgentId },
      ]);
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
    setSessionId(null);
    setDebateResult(null);
    setDebateError("");
  }

  // 난이도 선택
  if (phase === "selecting") {
    return <DifficultySelect onSelect={handleDifficultySelect} />;
  }

  // 토론 중
  if (phase === "debating") {
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
      <DebateLoading
        sessionId={sessionId}
        onDone={(result) => {
          setDebateResult(result);
          setPhase("done");
        }}
        onError={(msg) => {
          setDebateError(msg);
        }}
      />
    );
  }

  // 결과 화면
  if (phase === "done" && debateResult) {
    return (
      <DebateResult
        finalScore={debateResult.finalScore}
        agentEvaluations={debateResult.agentEvaluations}
        finalFeedback={debateResult.finalFeedback}
        debateSummary={debateResult.debateSummary}
        improvementTips={debateResult.improvementTips}
        onRestart={handleRestart}
      />
    );
  }

  // 면접 진행
  const isAnswered = messages[messages.length - 1]?.role === "candidate";
  const lastInterviewerIdx = messages.reduce((acc, m, i) => (m.role === "interviewer" ? i : acc), -1);
  const currentQuestion = isAnswered ? "" : (messages[lastInterviewerIdx]?.content ?? "");
  const currentQuestionAgentId = isAnswered ? undefined : messages[lastInterviewerIdx]?.agentId;
  const pastMessages = isAnswered ? messages : messages.slice(0, lastInterviewerIdx);

  const isTimeWarning = timeLeft <= 30 && timeLeft > 0;
  const isTimeUp = timeLeft === 0;

  return (
    <div className="space-y-4">
      {/* 진행 상황 */}
      <div className="flex items-center gap-2">
        {AGENT_ORDER.map((aid, i) => {
          const isDoneAgent = i < agentIndex;
          const isCurrentAgent = i === agentIndex;
          const colorMap: Record<AgentId, string> = {
            organization: "bg-purple-500",
            logic: "bg-blue-500",
            technical: "bg-green-500",
          };
          const dimMap: Record<AgentId, string> = {
            organization: "bg-purple-200 dark:bg-purple-900/40",
            logic: "bg-blue-200 dark:bg-blue-900/40",
            technical: "bg-green-200 dark:bg-green-900/40",
          };
          return (
            <div key={aid} className="flex-1 space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isDoneAgent
                    ? colorMap[aid]
                    : isCurrentAgent
                      ? dimMap[aid]
                      : "bg-gray-200 dark:bg-slate-700"
                }`}
              />
              <p
                className={`text-xs text-center truncate ${
                  isCurrentAgent
                    ? "font-semibold text-gray-700 dark:text-slate-300"
                    : "text-gray-400 dark:text-slate-600"
                }`}
              >
                {AGENTS[aid].label}
              </p>
            </div>
          );
        })}
      </div>

      {/* 이전 대화 */}
      {pastMessages.length > 0 && (
        <div className="space-y-3">
          {pastMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
              {m.role === "interviewer" && (
                <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[75%]">
                  {m.agentId && <AgentBadge agentId={m.agentId} />}
                  <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed shadow-card">
                    {m.content}
                  </div>
                </div>
              )}
              {m.role === "candidate" && (
                <div className="max-w-[85%] sm:max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
                  {m.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 현재 질문 */}
      {currentQuestion && (
        <div className="card border-blue-100 dark:border-blue-900/50 p-5 space-y-1">
          {currentQuestionAgentId && <AgentBadge agentId={currentQuestionAgentId} />}
          <p className="text-gray-900 dark:text-slate-100 text-base leading-relaxed pt-1">
            {currentQuestion}
          </p>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
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
