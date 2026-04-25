# weather-now

`wttr.in` 의 무료 JSON API 로 **현재 날씨** 를 즉답하는 skill. 키 불필요.

`weather-briefing` (매일 아침 알람 형) 과 별개 — 사용자가 "지금 날씨" 같은 즉답을 원할 때.

## 사용 예시

```
> 지금 서울 날씨 어때?
🌤 Seoul 날씨

Partly cloudy
기온: 18°C (체감 17°C)
습도: 62%
바람: 12 km/h NW
```

## 설정

| key | 기본값 | 설명 |
|---|---|---|
| `location` | `Seoul` | 도시명 또는 좌표 (예: `Tokyo`, `37.5,127.0`) |

`user.location.city` 가 있으면 그걸 우선 사용 (테넌트별 location 컨텍스트).

## API

[wttr.in](https://wttr.in) — 무료, 키 없음. `?format=j1` 로 JSON 응답.
