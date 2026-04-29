---
name: 프로젝트 현재 상태
description: 인프라 마이그레이션 계획
type: project
---

**인프라 마이그레이션 계획 (미완료):**
- 목표: 로컬 Ollama+ngrok → RunPod Serverless + vLLM + EXAONE 3.5 7.8B
- 이슈 #103: RunPod + vLLM 서버 셋업 (선행, 카드 등록 필요)
- 이슈 #104: Ollama API → vLLM OpenAI 호환 API 코드 마이그레이션 (후행)
- 로컬 개발은 계속 Ollama 사용, 프로덕션만 RunPod으로 전환 예정
- RunPod vLLM 설정값: MODEL=LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct, Trust Remote Code ON, Max Model Length 4096
