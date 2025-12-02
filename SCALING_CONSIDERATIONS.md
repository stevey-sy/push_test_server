# 대용량 메시지 처리 대비 사항

## 1. Rate Limiting (속도 제한)

### 문제점
- Firebase FCM API는 초당 요청 수에 제한이 있음
- 한 번에 너무 많은 요청을 보내면 429 (Too Many Requests) 에러 발생
- 현재 코드는 모든 토큰에 대해 동시에 Promise.all로 요청을 보냄

### 대비 방안
- **배치 처리**: 토큰을 작은 그룹(예: 100~500개)으로 나누어 순차 처리
- **Rate Limiting 라이브러리**: `bottleneck` 또는 `p-limit` 사용
- **지수 백오프(Exponential Backoff)**: 429 에러 발생 시 재시도 간격 증가

```javascript
// 예시: p-limit를 사용한 동시 요청 제한
const pLimit = require('p-limit');
const limit = pLimit(100); // 최대 100개 동시 요청

const sendPromises = tokens.map(token => 
  limit(() => sendMessage(token))
);
```

---

## 2. 메모리 관리

### 문제점
- 수만 개의 토큰을 한 번에 처리하면 메모리 부족 발생 가능
- Promise.all은 모든 Promise가 완료될 때까지 메모리에 보관
- 대량의 결과 데이터를 메모리에 저장

### 대비 방안
- **스트리밍 처리**: 토큰을 청크 단위로 처리하고 결과를 즉시 반환
- **배치 크기 제한**: 한 번에 처리할 최대 토큰 수 제한 (예: 10,000개)
- **결과 축소**: 상세 결과 대신 요약만 반환하거나 페이지네이션

```javascript
// 청크 단위 처리 예시
const CHUNK_SIZE = 1000;
for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
  const chunk = tokens.slice(i, i + CHUNK_SIZE);
  await processChunk(chunk);
}
```

---

## 3. 타임아웃 처리

### 문제점
- 네트워크 지연이나 FCM 서버 응답 지연 시 요청이 무한 대기
- 클라이언트가 응답을 기다리는 동안 연결 유지 필요

### 대비 방안
- **요청 타임아웃 설정**: 각 FCM 요청에 타임아웃 설정 (예: 30초)
- **전체 작업 타임아웃**: 전체 배치 처리 시간 제한
- **비동기 처리**: 대용량 작업은 백그라운드로 처리하고 작업 ID 반환

```javascript
// 타임아웃 예시
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 30000)
);

await Promise.race([
  admin.messaging().send(message),
  timeoutPromise
]);
```

---

## 4. 재시도 로직 (Retry Mechanism)

### 문제점
- 일시적인 네트워크 오류나 FCM 서버 오류로 실패할 수 있음
- 현재 코드는 실패 시 재시도하지 않음

### 대비 방안
- **지수 백오프 재시도**: 실패 시 점진적으로 재시도 간격 증가
- **재시도 가능한 에러 구분**: 일시적 에러만 재시도 (예: 네트워크 오류)
- **최대 재시도 횟수 제한**: 무한 재시도 방지

```javascript
// 재시도 로직 예시
async function sendWithRetry(message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await admin.messaging().send(message);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 지수 백오프
    }
  }
}
```

---

## 5. 응답 크기 제한

### 문제점
- 수만 개의 토큰 결과를 모두 반환하면 응답 크기가 매우 커짐
- 클라이언트 메모리 부족 및 네트워크 대역폭 낭비
- HTTP 응답 크기 제한 초과 가능

### 대비 방안
- **요약만 반환**: 상세 결과 대신 성공/실패 개수만 반환
- **스트리밍 응답**: Server-Sent Events (SSE) 또는 WebSocket 사용
- **결과 저장**: 결과를 DB나 파일에 저장하고 조회 API 제공

```javascript
// 요약만 반환
res.json({
  success: true,
  summary: {
    total: tokens.length,
    successCount: successCount,
    failureCount: failureCount
  },
  // results 배열 제거 또는 옵션으로 제공
  jobId: jobId // 비동기 작업 ID
});
```

---

## 6. 비동기 작업 처리 (Job Queue)

### 문제점
- 대용량 작업이 HTTP 요청 시간을 초과할 수 있음
- 클라이언트가 응답을 기다리는 동안 연결 유지 필요
- 서버 재시작 시 진행 중인 작업 손실

### 대비 방안
- **작업 큐 시스템**: Bull, BullMQ, RabbitMQ 등 사용
- **작업 상태 추적**: Redis나 DB에 작업 상태 저장
- **백그라운드 워커**: 별도 프로세스에서 작업 처리

```javascript
// 작업 큐 예시
const Queue = require('bull');
const pushQueue = new Queue('push notifications', {
  redis: { host: 'localhost', port: 6379 }
});

// 작업 등록
const job = await pushQueue.add({ tokens, message });
return { jobId: job.id, status: 'queued' };
```

---

## 7. 동시 요청 수 제한

### 문제점
- 여러 클라이언트가 동시에 대용량 요청을 보내면 서버 과부하
- FCM API rate limit 초과 가능

### 대비 방안
- **전역 Rate Limiting**: 서버 전체의 동시 처리량 제한
- **사용자별 Rate Limiting**: API 키나 사용자별 요청 제한
- **우선순위 큐**: 중요한 메시지 우선 처리

```javascript
// express-rate-limit 예시
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10 // 최대 10개 요청
});

app.post('/push', limiter, async (req, res) => {
  // ...
});
```

---

## 8. 로깅 및 모니터링

### 문제점
- 대용량 처리 시 성능 병목 지점 파악 어려움
- 에러 발생 시 원인 추적 어려움
- 리소스 사용량 모니터링 부족

### 대비 방안
- **구조화된 로깅**: Winston, Pino 등 사용
- **성능 메트릭 수집**: 처리 시간, 처리량, 에러율 등
- **알림 시스템**: 에러율이 높을 때 알림 (예: Slack, Email)
- **APM 도구**: New Relic, Datadog 등 사용

```javascript
// 성능 로깅 예시
const startTime = Date.now();
// ... 처리 ...
const duration = Date.now() - startTime;
logger.info('Push notification batch', {
  tokenCount: tokens.length,
  duration,
  successCount,
  failureCount,
  tokensPerSecond: tokens.length / (duration / 1000)
});
```

---

## 9. 에러 핸들링 개선

### 문제점
- 부분 실패 시 어떤 토큰이 실패했는지 파악 어려움
- 특정 에러 타입별 처리 부족 (예: invalid token, expired token)

### 대비 방안
- **에러 분류**: 에러 타입별 처리 (재시도 가능/불가능 구분)
- **무효 토큰 관리**: invalid-registration-token 에러는 DB에서 제거
- **에러 통계**: 에러 타입별 통계 수집

```javascript
// 에러 분류 예시
const errorHandlers = {
  'messaging/invalid-registration-token': (token) => {
    // DB에서 토큰 제거
    removeInvalidToken(token);
  },
  'messaging/registration-token-not-registered': (token) => {
    // 토큰 미등록 처리
    removeInvalidToken(token);
  },
  'messaging/rate-limit-exceeded': () => {
    // Rate limit 초과 - 재시도 필요
    return { shouldRetry: true, backoff: 5000 };
  }
};
```

---

## 10. 입력 검증 및 제한

### 문제점
- 무제한 토큰 수 허용 시 DoS 공격 가능
- 잘못된 형식의 토큰으로 인한 불필요한 요청

### 대비 방안
- **최대 토큰 수 제한**: 한 번에 처리할 최대 토큰 수 제한 (예: 10,000개)
- **토큰 형식 검증**: FCM 토큰 형식 검증
- **중복 토큰 제거**: 동일 토큰 중복 처리 방지

```javascript
// 입력 검증 예시
const MAX_TOKENS = 10000;
if (tokens.length > MAX_TOKENS) {
  return res.status(400).json({
    error: `최대 ${MAX_TOKENS}개의 토큰만 처리할 수 있습니다.`
  });
}

// 중복 제거
const uniqueTokens = [...new Set(tokens)];
```

---

## 11. 데이터베이스 연동

### 문제점
- 토큰 관리, 발신 이력, 통계 등이 없음
- 무효 토큰 관리 불가

### 대비 방안
- **토큰 저장소**: 사용자별 토큰 관리
- **발신 이력**: 발신 기록 저장 및 조회
- **통계 데이터**: 성공률, 실패율, 에러 타입별 통계

---

## 12. 보안 강화

### 문제점
- 인증/인가 없이 누구나 푸시 발신 가능
- API 키나 토큰 노출 위험

### 대비 방안
- **API 인증**: JWT, API Key 등 인증 추가
- **사용자별 권한**: 특정 사용자만 푸시 발신 가능하도록 제한
- **Rate Limiting**: 사용자별 요청 제한

---

## 13. 확장성 (Scalability)

### 문제점
- 단일 서버에서 모든 작업 처리
- 서버 장애 시 전체 서비스 중단

### 대비 방안
- **로드 밸런싱**: 여러 서버 인스턴스로 부하 분산
- **마이크로서비스**: 푸시 서비스를 별도 서비스로 분리
- **수평 확장**: 필요에 따라 서버 추가

---

## 14. Firebase 프로젝트 제한

### 문제점
- Firebase 프로젝트별 일일 메시지 제한 존재
- 여러 프로젝트 사용 시 관리 필요

### 대비 방안
- **다중 프로젝트 지원**: 여러 Firebase 프로젝트로 부하 분산
- **사용량 모니터링**: 일일 사용량 추적 및 알림
- **프로젝트 전환**: 한도 초과 시 자동으로 다른 프로젝트 사용

---

## 우선순위별 구현 권장사항

### 높은 우선순위 (즉시 구현 권장)
1. ✅ 배치 처리 및 Rate Limiting
2. ✅ 최대 토큰 수 제한
3. ✅ 타임아웃 처리
4. ✅ 재시도 로직

### 중간 우선순위
5. ✅ 응답 크기 제한 (요약만 반환)
6. ✅ 에러 핸들링 개선
7. ✅ 로깅 및 모니터링

### 낮은 우선순위 (장기적 개선)
8. ✅ 비동기 작업 큐
9. ✅ 데이터베이스 연동
10. ✅ 보안 강화

