---
name: CLAUDE.md 작성 규칙
description: Claude Code 공식 문서 기준 효과적인 CLAUDE.md 작성 지침
type: feedback
---

Claude Code 공식 문서(code.claude.com/docs/en/memory)의 지침에 따라 CLAUDE.md를 작성한다.

**Why:** 길고 중복된 CLAUDE.md는 컨텍스트 토큰을 낭비하고 adherence를 낮춘다. 간결하고 구체적인 파일이 더 잘 따라진다.

**How to apply:**

- **200줄 이하** 유지. 초과하면 `.claude/rules/`로 분리하거나 `@import` 사용.
- **코드로 발견 가능한 것은 제거**: 에이전트 페르소나 상세, UI 컴포넌트 세부사항, 기능 목록 등.
- **여러 파일을 읽어야만 알 수 있는 비자명한 결정** 위주로 작성: 아키텍처 패턴, 인증 흐름, 빌드 gotcha 등.
- **구체적·검증 가능한 지침** 사용: "Use 2-space indentation" ○, "Format code nicely" ✗.
- 마크다운 헤더·불릿으로 구조화 (덩어리 문단 금지).
- 중복 제거: 같은 내용이 여러 섹션에 반복되지 않도록.
- 규칙은 "반드시 지켜야 할 규칙" 섹션에 모아서 명시적으로.
