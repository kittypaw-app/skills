# 미세먼지 알림

미세먼지/초미세먼지 등급을 확인하고 텔레그램으로 알려줍니다.

## 설정

kittypaw-api 서버 연동 방식입니다 (API 키 직접 발급 불필요).

```bash
kittypaw login --api-url http://localhost:8080   # OAuth 로그인
kittypaw skill install air-quality                # 패키지 설치
```

- 측정소명: 가까운 측정소 (예: 종로구, 강남구)

## 알림 예시

🌫 미세먼지 알림 — 종로구
미세먼지(PM10): 42㎍/㎥ — 나쁨 😷
초미세먼지(PM2.5): 28㎍/㎥ — 보통 🙂
🎭 마스크를 챙기세요!
