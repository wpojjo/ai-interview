---
name: 배포 절차
description: Vercel 자동 배포 및 Ollama+ngrok 로컬 실행 방법
type: reference
---

**Vercel 배포:** GitHub main 브랜치 푸시 시 자동 배포

**로컬 Ollama + ngrok 실행 (Windows PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="*"; $env:OLLAMA_HOST="0.0.0.0"; ollama serve
ngrok http 11434
```
→ ngrok 주소를 Vercel 환경변수 `OLLAMA_BASE_URL`에 설정
→ ngrok 재실행마다 URL 바뀜 (매번 Vercel 환경변수 업데이트 필요)
