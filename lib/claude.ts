import Anthropic from "@anthropic-ai/sdk";
import { jobPostingAnalysisSchema, JobPostingAnalysis } from "./schemas";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

export async function extractJobPostingInfo(text: string): Promise<JobPostingAnalysis> {
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: `당신은 채용공고를 분석하는 전문가입니다. 채용공고 텍스트에서 다음 네 가지 정보를 추출하여 반드시 아래 JSON 형식으로만 응답하세요. 해당 내용이 없으면 빈 문자열("")로 반환하세요.

{
  "companyInfo": "회사 소개 및 정보",
  "responsibilities": "담당업무 내용",
  "requirements": "필수 자격요건",
  "preferredQuals": "우대사항"
}`,
    messages: [
      {
        role: "user",
        content: `다음 채용공고를 분석해주세요:\n\n${text}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonString = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(jsonString);
  return jobPostingAnalysisSchema.parse(parsed);
}
