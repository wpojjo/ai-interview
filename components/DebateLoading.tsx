"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentEvaluation, ModeratorResult } from "@/lib/agents";

export interface DebateResultData {
  agentEvaluations: AgentEvaluation[];
  finalScore: number;
  finalFeedback: ModeratorResult["overall"];
  debateSummary: string;
  improvementTips: string[];
}

interface Props {
  sessionId: string;
  onDone: (result: DebateResultData) => void;
  onError: (message: string) => void;
}

const STAGES: { status: string; label: string }[] = [
  { status: "evaluating", label: "에이전트별 평가 중" },
  { status: "debating", label: "면접관들이 토론 중" },
  { status: "finalizing", label: "최종 결과 정리 중" },
];

function stageIndex(status: string): number {
  const idx = STAGES.findIndex((s) => s.status === status);
  return idx === -1 ? STAGES.length : idx;
}

export default function DebateLoading({ sessionId, onDone, onError }: Props) {
  const [currentStatus, setCurrentStatus] = useState("evaluating");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/interview/debate/${sessionId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setCurrentStatus(data.status);

        if (data.status === "done") {
          clearInterval(intervalRef.current);
          onDone({
            agentEvaluations: data.agentEvaluations ?? [],
            finalScore: data.finalScore ?? 0,
            finalFeedback: data.finalFeedback ?? { strengths: "", weaknesses: "", advice: "" },
            debateSummary: data.debateSummary ?? "",
            improvementTips: data.improvementTips ?? [],
          });
        } else if (data.status === "error") {
          clearInterval(intervalRef.current);
          onError(data.errorMessage ?? "토론 중 오류가 발생했습니다");
        }
      } catch {
        // 일시적 네트워크 오류 무시
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 1500);
    return () => clearInterval(intervalRef.current);
  }, [sessionId, onDone, onError]);

  const current = stageIndex(currentStatus);

  return (
    <div className="card p-10 flex flex-col items-center justify-center space-y-8 text-center min-h-64">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 mb-1">
          면접관들이 평가하고 있습니다
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          3명의 전문 면접관이 토론을 진행 중입니다
        </p>
      </div>

      <div className="space-y-4 w-full max-w-xs">
        {STAGES.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={stage.status} className="flex items-center gap-3">
              {done ? (
                <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs shrink-0">
                  ✓
                </span>
              ) : active ? (
                <span className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-slate-600 shrink-0" />
              )}
              <span
                className={`text-sm ${
                  done
                    ? "text-gray-400 dark:text-slate-500 line-through"
                    : active
                      ? "text-gray-700 dark:text-slate-200 font-medium"
                      : "text-gray-400 dark:text-slate-600"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500">
        Ollama 모델에 따라 1~3분 소요될 수 있습니다
      </p>
    </div>
  );
}
