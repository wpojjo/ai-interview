import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import { extractJobPostingInfo } from "@/lib/claude";

const MAX_CHARS = 20_000;

async function fetchAndStripHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AI-Interview-Bot/1.0)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`URL 페이지를 가져올 수 없습니다 (${res.status}). 텍스트로 직접 붙여넣기를 이용해주세요.`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

export async function POST() {
  try {
    const sessionId = await getSessionFromCookie();
    if (!sessionId) {
      return NextResponse.json({ error: "세션이 없습니다" }, { status: 401 });
    }

    const { data: rows } = await supabase
      .from("job_postings")
      .select("*")
      .eq("sessionId", sessionId)
      .order("updatedAt", { ascending: false })
      .limit(1);

    const posting = rows?.[0] ?? null;
    if (!posting) {
      return NextResponse.json({ error: "저장된 채용공고가 없습니다" }, { status: 404 });
    }

    let textToAnalyze: string;

    if (posting.sourceType === "PDF") {
      return NextResponse.json(
        { error: "PDF 분석은 아직 지원되지 않습니다. 텍스트로 붙여넣기를 이용해주세요." },
        { status: 400 }
      );
    } else if (posting.sourceType === "LINK") {
      if (!posting.sourceUrl) {
        return NextResponse.json({ error: "URL이 없습니다" }, { status: 400 });
      }
      textToAnalyze = await fetchAndStripHtml(posting.sourceUrl);
    } else {
      if (!posting.rawText) {
        return NextResponse.json({ error: "텍스트가 없습니다" }, { status: 400 });
      }
      textToAnalyze = posting.rawText.slice(0, MAX_CHARS);
    }

    const analysis = await extractJobPostingInfo(textToAnalyze);

    const now = new Date().toISOString();
    const { data: updated } = await supabase
      .from("job_postings")
      .update({
        companyInfo:      analysis.companyInfo,
        responsibilities: analysis.responsibilities,
        requirements:     analysis.requirements,
        preferredQuals:   analysis.preferredQuals,
        updatedAt:        now,
      })
      .eq("id", posting.id)
      .select()
      .single();

    return NextResponse.json({ jobPosting: updated });
  } catch (error) {
    console.error("JobPosting analyze error:", error);
    const message = error instanceof Error ? error.message : "분석 중 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
