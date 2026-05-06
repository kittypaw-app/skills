# weather-now

**날씨 조회** skill. 현재 날씨와 1-6시간 뒤 임박 예보를 즉답합니다. 키 불필요.

한국 좌표는 KittyAPI의 기상청 KMA 프록시를 사용하고, 그 외 지역은 `wttr.in`을 사용합니다.
`weather-briefing`은 매일 아침 알람형 예보용으로 별도 유지합니다.

## 사용 예시

```
> 지금 서울 날씨 어때?
🌤 서울 현재 날씨

맑음/구름
기온: 18°C
습도: 62%
바람: 2.1 m/s
1시간 강수: 없음
```

```
> 3시간 뒤 서울 비 와?
🌤 서울 22:00 임박 예보

구름많음
기온: 17°C
습도: 66%
바람: 2.5 m/s
1시간 강수: 없음
```

## 설정

| key | 기본값 | 설명 |
|---|---|---|
| `location` | `Seoul` | 도시명 표시값 |
| `latitude` | 없음 | 한국 좌표면 KMA 사용 |
| `longitude` | 없음 | 한국 좌표면 KMA 사용 |

`user.location.city` 가 있으면 그걸 우선 사용 (테넌트별 location 컨텍스트).
호출자가 `ctx.params.time_scope`를 넘기면 임박 예보로 처리하고, 없으면 현재 날씨로 처리합니다.

## API

- KittyAPI KMA proxy — 한국 좌표의 초단기실황/초단기예보.
- [wttr.in](https://wttr.in) — 해외/좌표 미지정 fallback. 무료, 키 없음.
