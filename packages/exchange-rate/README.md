# exchange-rate

ECB 데이터 기반의 무료 환율 조회 skill. API 키 불필요.

## 사용 예시

```
> 환율 알려줘
📈 환율 (2026-04-25)

1 USD = 1,475.23 KRW
1 USD = 0.94 EUR
1 USD = 154.32 JPY
...
```

## 설정

| key | 기본값 | 설명 |
|---|---|---|
| `base` | `USD` | 기준 통화 (3-letter ISO 코드) |
| `symbols` | `KRW,EUR,JPY,CNY,GBP` | 조회 통화 (콤마 구분) |

## API

[Frankfurter](https://www.frankfurter.app/) — European Central Bank 의 일별 reference rates.
무료, 키 없음, rate limit 없음. 영업일 16:00 CET 갱신.
