# stock-quote

Alpha Vantage `GLOBAL_QUOTE` 로 미국 주식의 현재가를 즉답하는 skill.
알람용 `stock-alert` 와 별개 — 사용자가 "AAPL 얼마야?" 같은 즉답 원할 때.

## 사용 예시

```
> 애플 주가 알려줘
💹 AAPL 현재가 (2026-04-24)

▲ $189.41 (+1.23, +0.65%)
고가: $190.50  /  저가: $187.20
거래량: 53,419,021
```

## 설정

| key | 필수 | 설명 |
|---|---|---|
| `api_key` | ✅ | Alpha Vantage API 키 — [무료 발급](https://www.alphavantage.co/support/#api-key) |
| `default_symbol` | — | 사용자가 종목을 명시 안 했을 때 기본값 (기본 `AAPL`) |

## 무료 tier 제약

- 25 requests/day
- 5 requests/min

이를 초과하면 응답 본문에 `Note` 필드로 안내됨 (skill 이 그 메시지를 그대로 반환).

## API

[Alpha Vantage GLOBAL_QUOTE](https://www.alphavantage.co/documentation/#latestprice)
