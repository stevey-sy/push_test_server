# Push Server

Express를 사용한 안드로이드 푸시 메시지 발신 테스트 서버입니다.

## 설치 방법

```bash
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 Firebase 서비스 계정 정보를 설정하세요.

### Firebase 서비스 계정 키 발급 방법

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택
3. 프로젝트 설정 > 서비스 계정 탭
4. "새 비공개 키 만들기" 클릭하여 JSON 파일 다운로드
5. JSON 파일의 내용을 환경 변수로 설정

### .env 파일 예시

**방법 1: JSON 전체를 문자열로 저장**
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
```

**방법 2: 개별 필드로 저장 (권장)**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

## 실행 방법

```bash
# 일반 실행
npm start

# 개발 모드 (nodemon 사용)
npm run dev
```

## API 엔드포인트

### 1. Health Check
```
GET /health
```

서버 상태 및 FCM 초기화 여부를 확인합니다.

**응답 예시:**
```json
{
  "status": "ok",
  "fcmInitialized": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. 푸시 메시지 발신
```
POST /push
Content-Type: application/json
```

안드로이드 디바이스로 푸시 메시지를 발신합니다.

**요청 본문:**
```json
{
  "token": "디바이스의 FCM 토큰"
}
```

**선택적 메시지 커스터마이징:**
```json
{
  "token": "디바이스의 FCM 토큰",
  "message": {
    "notification": {
      "title": "커스텀 제목",
      "body": "커스텀 내용"
    },
    "data": {
      "type": "custom",
      "customKey": "customValue"
    }
  }
}
```

**데이터 필드 사용법:**
- `data` 필드에 커스텀 데이터를 키-값 쌍으로 담아서 보냅니다
- 모든 값은 문자열로 변환되어 전달됩니다
- 앱에서 이 데이터를 받아서 처리할 수 있습니다

**데이터 예시:**
```json
{
  "token": "디바이스의 FCM 토큰",
  "message": {
    "notification": {
      "title": "새 메시지",
      "body": "데이터가 포함된 푸시 알림입니다"
    },
    "data": {
      "type": "message",
      "userId": "12345",
      "messageId": "67890",
      "action": "open_chat",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "customData1": "값1",
      "customData2": "값2"
    },
    "android": {
      "priority": "high",
      "notification": {
        "sound": "default",
        "channelId": "default"
      }
    }
  }
}
```

**성공 응답:**
```json
{
  "success": true,
  "messageId": "0:1234567890",
  "sentAt": "2024-01-01T00:00:00.000Z"
}
```

**실패 응답:**
```json
{
  "success": false,
  "error": "에러 메시지",
  "code": "에러 코드"
}
```

## 테스트 예시

### cURL 사용
```bash
curl -X POST http://localhost:3000/push \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-fcm-device-token"
  }'
```

### JavaScript (fetch)
```javascript
fetch('http://localhost:3000/push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: 'your-fcm-device-token'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## 기본 푸시 메시지 형식

서버는 미리 준비된 기본 JSON 메시지를 사용합니다:

```json
{
  "notification": {
    "title": "테스트 알림",
    "body": "안드로이드 푸시 메시지 테스트입니다."
  },
  "data": {
    "type": "test",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "channelId": "default"
    }
  }
}
```

이 메시지는 `server.js`의 `defaultPushMessage` 변수에서 수정할 수 있습니다.

