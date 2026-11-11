# 강사 API 연결 자료 (수강생 배포용)

이 파일은 그림 파일 세 개(로고 `tumble-factory-logo.png` 1개, 현장 사진 `factory.png`·`warehouse.png` 2장)와 함께 수강생 저장소의 `milestone-0`부터 들어 있는 자료입니다. 프로젝트 폴더 맨 위(`package.json` 옆)에 `API_CONTRACT.md`라는 이름으로 있습니다. 2회차부터 AI 도구가 이 파일을 읽어 씁니다.

## 1. 주소와 요청

- 1단계 강사 API 주소: `https://api-tumbler-dashboard.adapterz.kr`
- 화면이 쓰는 요청은 읽기 전용 GET 두 개입니다. 강사 전용 조작 경로는 쓰지 않습니다.

| 요청 | 쓰는 곳 |
|---|---|
| `GET <주소>/api/v1/snapshot` | 오늘 운영 화면 전체(현재 기준) |
| `GET <주소>/api/v1/snapshot?at=<시각>` | 기준 시각을 과거로 골랐을 때 |
| `GET <주소>/api/v1/records?kind=production&at=<시각>&from=<시각>&to=<시각>` | 생산 기록 화면. 출고는 `kind=shipment` |

- `<시각>`은 `2026-10-26T01:00:00.000Z`처럼 끝에 `Z`가 붙은 ISO 시각입니다. 쿼리는 `URLSearchParams`로 만듭니다.
- records의 `at`은 늘 붙입니다(마지막 snapshot의 `viewTime`). `from`·`to`를 빼면 오늘 00:00부터 `at`까지입니다.
- 모든 응답에 `Access-Control-Allow-Origin: *`가 붙어 있어 내 PC의 화면(`http://127.0.0.1:4173`)에서 바로 부를 수 있습니다.
- 응답의 시각은 모두 UTC입니다. 화면에는 한국 시간으로 바꿔 보여 줍니다. 예: `2026-10-26T01:00:00.000Z`는 한국 시간 10월 26일 10:00입니다.

## 2. snapshot에서 화면이 쓰는 필드

| 필드 | 뜻 |
|---|---|
| `schemaVersion` | 자료 형식 번호. 1 |
| `revision` | 강사가 상황을 바꿀 때마다 오르는 번호. 1 이상 |
| `scenarioId` | 강사가 고른 상황 이름(화면에는 보이지 않음) |
| `changedAt`, `serverTime` | 상황을 바꾼 시각, 이 응답을 만든 서버 시각 |
| `viewTime` | 이 자료의 기준 시각. 현재 조회면 `serverTime`과 같고, `at`을 보냈으면 `at`과 같습니다 |
| `trainingOnly` | 교육용 자료 표시. 항상 `true` |
| `sites.factory`, `sites.warehouse` | 공장(생산)과 창고(출고) |
| `sites.*.target`, `sites.*.completed` | 오늘 목표와 기준 시각까지 처리가 끝난 수량. 처리된 기록이 없으면 `completed`는 0이 아니라 `null` |
| `sites.*.lastEventAt`, `receivedAt`, `processedAt` | 마지막 기록의 발생·서버 접수·서버 처리 시각. 없으면 `null` |
| `sites.*.status` | `normal` 또는 `warning` |
| `sites.*.note` | 현장 상태 문구 |
| `sites.*.processingState` | `completed`(처리 완료), `waiting`(처리 대기), `paused`(처리 중단) |
| `sites.*.history[]` | 시간별 완료 수량. `timestamp`(정시), `quantity` |
| `sites.*.image` | 참고 사진 `url`과 `alt`. 화면은 `url`을 고치지 않고 그대로 씁니다 |
| `services.alerts` | 알림 전송 결과 `status`(`sent`·`failed`), `lastAttemptAt` |
| `incidents[]` | 확인할 일 목록. `id`, `scope`, `level`(`warning`·`error`), `title`, `owner`, `action` |

화면이 쓰지 않는 필드: `services.api`, `services.prediction`, `mode`, `sessionId`. `incidents`의 `PREDICTION-JOB`은 화면에서 뺍니다.

## 3. records 필드

응답은 `{ "sessionId": …, "viewTime": …, "records": [ … ] }`입니다. 기록 한 건은 `id`, `kind`, `quantity`, `occurredAt`, `receivedAt`, `processedAt`, `status`입니다. `status`는 `completed`(완료), `processing-wait`(처리 대기), `receipt-wait`(접수 대기)입니다. 기준 시각 뒤에 일어난 접수·처리 시각은 `null`로 옵니다.

## 4. 화면이 확인할 필드

아래 순서로 검사하고, 처음 틀린 칸 하나만 알려 줍니다. 틀리면 그 응답 전체를 조회 실패로 봅니다.
안내 문구는 `<앞 문장> 틀린 항목: <칸> (기대: <기대 형식>)` 꼴입니다. `<시각>`은 `시각 문자열(예: 2026-10-15T09:00:00+09:00)`이라고 씁니다. 시각 칸은 글자이고 JavaScript `Date.parse`로 읽을 수 있으면 맞는 것으로 봅니다. 끝에 `Z`나 `+09:00`이 없다는 이유로 틀렸다고 하지 않습니다.

snapshot. 앞 문장은 "서버 자료의 기본 형식을 확인해 주세요."(incidents 칸은 "서비스 상태의 형식을 확인해 주세요.", viewTime은 "조회 기준 시각을 확인해 주세요.")

| 순서 | 칸 | 기대 형식 |
|---|---|---|
| 1 | `(응답 전체)` | JSON 객체 |
| 2 | `schemaVersion` | 숫자 1 |
| 3 | `revision` | 1 이상의 정수 |
| 4 | `scenarioId` | 문자열 |
| 5 | `changedAt` | `<시각>` |
| 6 | `serverTime` | `<시각>` |
| 7 | `trainingOnly` | true |
| 8 | `sites` | 객체 |
| 9 | `services` | 객체 |
| 10 | `incidents` | 배열 |
| 11 | `incidents[0]` | 객체 |
| 12 | `incidents[0].id` | 문자열 |
| 13 | `incidents[0].level` | "warning" 또는 "error" |
| 14 | `incidents[0].title`, `.owner`, `.action` | 문자열 |
| 15 | `viewTime`(있을 때만) | serverTime 이전이거나 같은 `<시각>` |

records. 앞 문장은 "기록 응답 형식이 올바르지 않습니다."

| 순서 | 칸 | 기대 형식 |
|---|---|---|
| 1 | `(응답 전체)` | JSON 객체 |
| 2 | `records` | 배열 |
| 3 | `records[0]` | 객체 |
| 4 | `records[0].quantity` | 0 이상의 정수 |
| 5 | `records[0].occurredAt` | 기준 시각 이전이거나 같은 `<시각>` |
| 6 | `records[0].receivedAt`, `.processedAt` | null 또는 기준 시각 이전이거나 같은 `<시각>` |

- `incidents[0]`, `records[0]`의 0은 몇 번째 항목인지에 따라 바뀝니다.
- `sites` 아래 값(수량·목표·시각·사진)은 여기서 검사하지 않습니다. 틀린 값은 그 칸만 "확인 불가"나 "기록 대기"로 보입니다.
- 응답 최상위에 글자로 된 `error`가 있으면 위 검사 전에 실패로 봅니다(3단계 GAS가 실패를 이 모양으로 보냅니다).

예: `서버 자료의 기본 형식을 확인해 주세요. 틀린 항목: revision (기대: 1 이상의 정수)`

## 5. 예시 응답 (2·3회차 연습용)

2회차에 `public/sample-data.js`로 옮겨 씁니다. 실제 강사 API와 모양이 같고 날짜만 고정했습니다(한국 시간 2026-10-26 13:10 기준).

```json
{
  "schemaVersion": 1,
  "scenarioId": "normal",
  "revision": 1,
  "changedAt": "2026-10-26T00:00:00.000Z",
  "serverTime": "2026-10-26T04:10:00.000Z",
  "viewTime": "2026-10-26T04:10:00.000Z",
  "trainingOnly": true,
  "sites": {
    "factory": {
      "label": "텀블공장",
      "target": 120,
      "completed": 100,
      "lastEventAt": "2026-10-26T03:55:00.000Z",
      "receivedAt": "2026-10-26T03:55:02.000Z",
      "processedAt": "2026-10-26T03:55:05.000Z",
      "status": "normal",
      "note": "기록이 반영되고 있습니다.",
      "processingState": "completed",
      "history": [
        { "timestamp": "2026-10-26T00:00:00.000Z", "quantity": 20 },
        { "timestamp": "2026-10-26T01:00:00.000Z", "quantity": 30 },
        { "timestamp": "2026-10-26T02:00:00.000Z", "quantity": 25 },
        { "timestamp": "2026-10-26T03:00:00.000Z", "quantity": 25 }
      ],
      "image": { "url": "./assets/approved/factory.png", "alt": "생산 라인 참고 사진" }
    },
    "warehouse": {
      "label": "물류창고",
      "target": 100,
      "completed": 75,
      "lastEventAt": "2026-10-26T03:58:00.000Z",
      "receivedAt": "2026-10-26T03:58:02.000Z",
      "processedAt": "2026-10-26T03:58:05.000Z",
      "status": "normal",
      "note": "기록이 반영되고 있습니다.",
      "processingState": "completed",
      "history": [
        { "timestamp": "2026-10-26T00:00:00.000Z", "quantity": 15 },
        { "timestamp": "2026-10-26T01:00:00.000Z", "quantity": 20 },
        { "timestamp": "2026-10-26T02:00:00.000Z", "quantity": 20 },
        { "timestamp": "2026-10-26T03:00:00.000Z", "quantity": 20 }
      ],
      "image": { "url": "./assets/approved/warehouse.png", "alt": "물류창고 참고 사진" }
    }
  },
  "services": {
    "api": { "status": "normal", "note": "조회 서비스가 정상입니다." },
    "alerts": { "status": "sent", "lastAttemptAt": "2026-10-26T03:30:00.000Z", "note": "모의 전송 성공 기록입니다. 실제 알림을 보내지 않았습니다." }
  },
  "incidents": [],
  "mode": "current",
  "sessionId": "sample"
}
```

## 6. 예시 기록 (2·3회차 연습용)

```json
{
  "production": [
    { "id": "sample-p-1", "kind": "production", "quantity": 20, "occurredAt": "2026-10-26T00:20:00.000Z", "receivedAt": "2026-10-26T00:20:02.000Z", "processedAt": "2026-10-26T00:20:05.000Z", "status": "completed" },
    { "id": "sample-p-2", "kind": "production", "quantity": 30, "occurredAt": "2026-10-26T01:20:00.000Z", "receivedAt": "2026-10-26T01:20:02.000Z", "processedAt": "2026-10-26T01:20:05.000Z", "status": "completed" },
    { "id": "sample-p-3", "kind": "production", "quantity": 25, "occurredAt": "2026-10-26T02:20:00.000Z", "receivedAt": "2026-10-26T02:20:02.000Z", "processedAt": "2026-10-26T02:20:05.000Z", "status": "completed" },
    { "id": "sample-p-4", "kind": "production", "quantity": 25, "occurredAt": "2026-10-26T03:55:00.000Z", "receivedAt": "2026-10-26T03:55:02.000Z", "processedAt": "2026-10-26T03:55:05.000Z", "status": "completed" }
  ],
  "shipment": [
    { "id": "sample-s-1", "kind": "shipment", "quantity": 15, "occurredAt": "2026-10-26T00:30:00.000Z", "receivedAt": "2026-10-26T00:30:02.000Z", "processedAt": "2026-10-26T00:30:05.000Z", "status": "completed" },
    { "id": "sample-s-2", "kind": "shipment", "quantity": 20, "occurredAt": "2026-10-26T01:30:00.000Z", "receivedAt": "2026-10-26T01:30:02.000Z", "processedAt": "2026-10-26T01:30:05.000Z", "status": "completed" },
    { "id": "sample-s-3", "kind": "shipment", "quantity": 20, "occurredAt": "2026-10-26T02:30:00.000Z", "receivedAt": "2026-10-26T02:30:02.000Z", "processedAt": "2026-10-26T02:30:05.000Z", "status": "completed" },
    { "id": "sample-s-4", "kind": "shipment", "quantity": 20, "occurredAt": "2026-10-26T03:58:00.000Z", "receivedAt": "2026-10-26T03:58:02.000Z", "processedAt": "2026-10-26T03:58:05.000Z", "status": "completed" }
  ]
}
```

## 7. 시험용 사건 (2·3회차 알림 연습용)

`incidents` 배열에 하나씩 넣어 보고, 확인한 뒤 빈 배열로 되돌립니다.

```json
{ "id": "FACTORY-FEED", "scope": "factory", "level": "warning", "title": "텀블공장 기록이 30분 넘게 들어오지 않았습니다.", "owner": "공장 데이터 담당자", "action": "기록 수집과 처리 상태를 확인해 주세요." }
```

```json
{ "id": "ALERT-DELIVERY", "scope": "service", "level": "error", "title": "알림 전송에 실패했습니다.", "owner": "서비스 운영 담당자", "action": "전송 기록을 확인하고 다시 시도해 주세요." }
```

## 8. 강사가 바꾸는 상황

강사가 조작 화면에서 상황을 바꾸면 반 전체의 다음 조회에 같은 결과가 나옵니다. 수강생은 상황을 바꾸지 않습니다.

| 상황 | 응답에서 바뀌는 것 |
|---|---|
| `normal`(정상) | 사건 없음. 단, 마지막 기록 뒤 30분 넘게 새 기록이 없으면 서버가 현장 `status`를 `warning`으로 바꾸고 "…기록이 30분 넘게 들어오지 않았습니다." 사건을 넣습니다 |
| `factory-delay`(공장 지연) | 수량 10개짜리 생산 기록 한 건이 접수·처리되지 않은 채 추가됩니다. 공장 `processingState`가 `paused`, 접수·처리 시각이 `null`, 사건 "텀블공장 기록 처리가 중단됐습니다." 완료 수량은 그대로입니다 |
| `warehouse-delay`(창고 지연) | 수량 10개짜리 출고 기록 한 건이 접수만 된 채 추가됩니다. 창고 `processingState`가 `paused`, 처리 시각이 `null`, 사건 "물류창고 기록 처리가 중단됐습니다." |
| `alert-failure`(알림 실패) | `services.alerts.status`가 `failed`, 사건 `ALERT-DELIVERY`(level `error`) |
| `prediction-failure`(예측 실패) | 사건 `PREDICTION-JOB`이 오지만 화면은 이 사건을 뺍니다. 화면에 보이는 변화는 없습니다 |
| `api-error`(조회 오류) | 현재 snapshot 요청이 HTTP 503입니다. `at`을 붙인 과거 조회와 records는 200입니다 |

## 9. 다음 단계에서 바뀌는 것

| 단계 | `public/config.js`의 `apiBaseUrl` | `timeoutMs` |
|---|---|---|
| 1단계 강사 API | `"https://api-tumbler-dashboard.adapterz.kr"` | 5000 |
| 2단계 내가 만든 서버 | `"http://127.0.0.1:3000"` | 5000 |
| 3단계 내 GAS 웹 앱 | `"<GAS 웹앱 주소>"`(`…/exec`로 끝남) | 15000 |

3단계 주소는 `/exec`로 끝나서, 화면은 `<GAS 웹앱 주소>?path=/api/v1/snapshot`처럼 경로를 `path`로 넘깁니다. GAS는 실패해도 200으로 답하고 본문이 `{"error": "<이유>"}`입니다.
