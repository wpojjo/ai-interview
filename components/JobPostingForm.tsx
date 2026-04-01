"use client";

import { useState } from "react";
import Link from "next/link";

type SourceType = "LINK" | "TEXT" | "PDF";

interface AnalysisResult {
  companyInfo:      string;
  responsibilities: string;
  requirements:     string;
  preferredQuals:   string;
}

interface InitialData {
  sourceType?:      string;
  sourceUrl?:       string | null;
  rawText?:         string | null;
  fileName?:        string | null;
  companyInfo?:     string | null;
  responsibilities?: string | null;
  requirements?:    string | null;
  preferredQuals?:  string | null;
}

export default function JobPostingForm({ initialData }: { initialData?: InitialData | null }) {
  const [sourceType, setSourceType] = useState<SourceType>(
    (initialData?.sourceType as SourceType) ?? "LINK"
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? "");
  const [rawText, setRawText]     = useState(initialData?.rawText ?? "");
  const [fileName, setFileName]   = useState(initialData?.fileName ?? "");
  const [saving, setSaving]       = useState(false);
  const [status, setStatus]       = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "success" | "error">(
    initialData?.companyInfo || initialData?.responsibilities || initialData?.requirements || initialData?.preferredQuals
      ? "success"
      : "idle"
  );
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(
    initialData?.companyInfo != null
      ? {
          companyInfo:      initialData.companyInfo      ?? "",
          responsibilities: initialData.responsibilities ?? "",
          requirements:     initialData.requirements     ?? "",
          preferredQuals:   initialData.preferredQuals   ?? "",
        }
      : null
  );

  const canAnalyze = status === "success" || !!initialData?.sourceType;

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    setAnalysisStatus("idle");
    setAnalysis(null);
    try {
      await fetch("/api/session");

      const payload = {
        sourceType,
        sourceUrl: sourceType === "LINK" ? sourceUrl : undefined,
        rawText:   sourceType === "TEXT" ? rawText   : undefined,
        fileName:  sourceType === "PDF"  ? fileName  : undefined,
      };

      const res  = await fetch("/api/job-posting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? "저장에 실패했습니다");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    setAnalysisStatus("loading");
    setAnalysisError("");
    try {
      const res  = await fetch("/api/job-posting/analyze", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setAnalysisError(data.error ?? "분석에 실패했습니다");
        setAnalysisStatus("error");
      } else {
        setAnalysis({
          companyInfo:      data.jobPosting.companyInfo      ?? "",
          responsibilities: data.jobPosting.responsibilities ?? "",
          requirements:     data.jobPosting.requirements     ?? "",
          preferredQuals:   data.jobPosting.preferredQuals   ?? "",
        });
        setAnalysisStatus("success");
      }
    } catch {
      setAnalysisError("네트워크 오류가 발생했습니다");
      setAnalysisStatus("error");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  }

  return (
    <div className="space-y-6">
      {/* 입력 폼 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(["LINK", "TEXT", "PDF"] as SourceType[]).map((type) => (
            <button
              key={type}
              onClick={() => { setSourceType(type); setStatus("idle"); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                sourceType === type
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {type === "LINK" ? "링크 입력" : type === "TEXT" ? "텍스트 붙여넣기" : "PDF 업로드"}
            </button>
          ))}
        </div>
        <div className="p-5">
          {sourceType === "LINK" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">채용공고 URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.wanted.co.kr/wd/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400">원티드, 잡코리아, 링크드인 등의 채용공고 링크를 붙여넣으세요</p>
            </div>
          )}
          {sourceType === "TEXT" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">채용공고 텍스트</label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="채용공고 내용을 복사해서 붙여넣어주세요..."
                rows={12}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400">채용 사이트에서 공고 내용 전체를 복사해 붙여넣으세요</p>
            </div>
          )}
          {sourceType === "PDF" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">PDF 파일 업로드</label>
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-center">
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm text-gray-600 font-medium">
                    {fileName ? fileName : "클릭하여 PDF를 선택하세요"}
                  </p>
                  {!fileName && <p className="text-xs text-gray-400 mt-1">PDF 파일만 업로드 가능</p>}
                </div>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              </label>
              {fileName && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{fileName}</span>
                  <button onClick={() => setFileName("")} className="text-xs text-red-500 hover:text-red-600">
                    제거
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400">현재 단계에서는 파일 이름만 저장됩니다. 분석 기능은 다음 단계에서 지원됩니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 저장 / 분석 버튼 영역 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="h-8">
          {status === "success" && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-green-700 text-sm font-medium">
              저장되었습니다. 아래에서 채용공고를 분석해보세요.
            </div>
          )}
          {status === "error" && <p className="text-red-500 text-sm">{errorMessage}</p>}
        </div>
        <div className="flex gap-3">
          <Link
            href="/profile"
            className="text-gray-600 font-medium px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
          >
            ← 프로필 수정
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>

      {/* 분석하기 섹션 */}
      {canAnalyze && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">채용공고 분석</h2>
              <p className="text-xs text-gray-500 mt-0.5">AI가 회사정보·담당업무·자격요건·우대사항을 추출합니다</p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analysisStatus === "loading" || saving}
              className="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {analysisStatus === "loading" ? "분석 중..." : "분석하기"}
            </button>
          </div>

          {analysisStatus === "error" && (
            <p className="text-red-500 text-sm">{analysisError}</p>
          )}

          {analysisStatus === "success" && analysis && (
            <div className="space-y-3 pt-1">
              {(
                [
                  { key: "companyInfo",      label: "회사정보" },
                  { key: "responsibilities", label: "담당업무" },
                  { key: "requirements",     label: "필수 자격요건" },
                  { key: "preferredQuals",   label: "우대사항" },
                ] as { key: keyof AnalysisResult; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">{label}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {analysis[key] || "해당 내용 없음"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
