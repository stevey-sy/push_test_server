# Push Message Test Server

> **Quick Start:** All you need are your **Firebase Service Account JSON file** and **FCM tokens** to start testing!

A simple Express-based server for testing push notifications to Android/iOS devices using Firebase Cloud Messaging (FCM).

[한국어 버전 보기 (View Korean Version)](#한국어-버전)

---

## Features

- 🚀 Simple web interface for sending push notifications
- 📱 Support for multiple FCM tokens
- 🔄 Send multiple messages per token (bulk testing)
- ✏️ Customizable message JSON (notification, data, android/ios specific settings)
- 📊 Detailed response with success/failure counts
- 🎯 Perfect for testing push notification implementations

## Prerequisites

To use this server, you only need **two things**:

1. **Firebase Service Account JSON file** - Get it from your Firebase Console
2. **FCM Device Tokens** - Get these from your mobile app

That's it! No complex setup required.

## Installation

```bash
npm install
```

## Firebase Service Account Setup

### How to Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts tab
4. Click "Generate New Private Key" to download the JSON file
5. Save the JSON file securely

### Environment Variable Setup

Create a `.env` file in the project root and configure your Firebase credentials using **one of the following methods**:

**Method 1: JSON file path (Recommended for local development)**
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/your-firebase-service-account.json
```

**Method 2: Complete JSON as string (Good for deployment)**
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",...}'
```

**Method 3: Individual fields (Most secure for production)**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

## Running the Server

```bash
# Standard mode
npm start

# Development mode (with nodemon)
npm run dev
```

The server will start on `http://localhost:3000` (or the PORT specified in your .env file).

## Usage

### Web Interface

1. Open your browser and go to `http://localhost:3000`
2. Enter one or more FCM device tokens
3. (Optional) Customize the message JSON
4. Set the number of messages to send per token
5. Click "Send" button

### API Endpoints

#### 1. Health Check
```
GET /health
```

Check if the server and FCM are properly initialized.

**Response:**
```json
{
  "status": "ok",
  "fcmInitialized": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Get Default Message Template
```
GET /message-template
```

Returns the default message template used by the server.

#### 3. Send Push Messages
```
POST /push
Content-Type: application/json
```

**Request Body:**
```json
{
  "tokens": ["token1", "token2"],
  "messagesPerToken": 10,
  "message": {
    "notification": {
      "title": "Test Notification",
      "body": "This is a test message"
    },
    "data": {
      "key1": "value1",
      "key2": "value2"
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

**Parameters:**
- `tokens` (required): Array of FCM device tokens
- `messagesPerToken` (optional): Number of messages to send per token (default: 10, max: 100)
- `message` (optional): Custom message object. If not provided, uses default template.

**Success Response:**
```json
{
  "success": true,
  "summary": {
    "totalTokens": 2,
    "messagesPerToken": 10,
    "totalMessages": 20,
    "successCount": 20,
    "failureCount": 0
  },
  "results": [
    {
      "token": "token1",
      "messageIndex": 1,
      "success": true,
      "messageId": "0:1234567890",
      "error": null
    }
  ],
  "sentAt": "2024-01-01T00:00:00.000Z"
}
```

## Message Customization

The `message` object in the request body supports all FCM message properties:

- **notification**: The notification to show to the user
  - `title`: Notification title
  - `body`: Notification body text

- **data**: Custom key-value pairs (all values will be converted to strings)
  - Use this to send custom data to your app
  - Your app can handle this data even when in the background

- **android**: Android-specific options
  - `priority`: Message priority ("high" or "normal")
  - `notification.sound`: Notification sound
  - `notification.channelId`: Android notification channel ID

- **apns**: iOS-specific options
  - Configure iOS notification behavior

## Testing Example

### Using cURL
```bash
curl -X POST http://localhost:3000/push \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["your-fcm-device-token"],
    "messagesPerToken": 5
  }'
```

### Using JavaScript (fetch)
```javascript
fetch('http://localhost:3000/push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tokens: ['your-fcm-device-token'],
    messagesPerToken: 5,
    message: {
      notification: {
        title: 'Custom Title',
        body: 'Custom message body'
      },
      data: {
        eventId: '12345',
        type: 'custom_event'
      }
    }
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## Troubleshooting

### FCM Not Initialized
- Make sure your `.env` file is properly configured
- Verify that your Firebase Service Account JSON is valid
- Check that the file path (if using Method 1) is correct

### Token Error
- Verify that your FCM tokens are valid and not expired
- Make sure tokens are from the same Firebase project
- Check that your app is properly registered with FCM

### Network Error
- Ensure your server has internet connectivity
- Check if your firewall is blocking outgoing connections
- Verify that FCM services are not blocked

## License

MIT

---

## 한국어 버전

<details>
<summary><b>클릭하여 한국어 문서 보기</b></summary>

# Push Message Test Server

> **빠른 시작:** 테스트를 위해 필요한 것은 **Firebase 서비스 계정 JSON 파일**과 **FCM 토큰** 뿐입니다!

Express를 사용한 Android/iOS 기기로 푸시 알림을 테스트하기 위한 간단한 서버입니다.

## 특징

- 🚀 푸시 알림 발송을 위한 간단한 웹 인터페이스
- 📱 다중 FCM 토큰 지원
- 🔄 토큰당 여러 메시지 발송 (대량 테스트)
- ✏️ 커스터마이징 가능한 메시지 JSON (notification, data, android/ios 특정 설정)
- 📊 성공/실패 개수가 포함된 상세한 응답
- 🎯 푸시 알림 구현 테스트에 완벽함

## 필수 요구사항

이 서버를 사용하기 위해 필요한 것은 **단 두 가지**입니다:

1. **Firebase 서비스 계정 JSON 파일** - Firebase 콘솔에서 발급받으세요
2. **FCM 디바이스 토큰** - 모바일 앱에서 얻을 수 있습니다

이것이 전부입니다! 복잡한 설정이 필요 없습니다.

## 설치 방법

```bash
npm install
```

## Firebase 서비스 계정 설정

### Firebase 서비스 계정 키 발급 방법

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택
3. 프로젝트 설정 > 서비스 계정 탭으로 이동
4. "새 비공개 키 생성" 클릭하여 JSON 파일 다운로드
5. JSON 파일을 안전하게 보관

### 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 **다음 방법 중 하나로** Firebase 인증 정보를 설정하세요:

**방법 1: JSON 파일 경로 (로컬 개발에 권장)**
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/your-firebase-service-account.json
```

**방법 2: JSON 전체를 문자열로 (배포에 적합)**
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",...}'
```

**방법 3: 개별 필드 (프로덕션에서 가장 안전)**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

## 서버 실행

```bash
# 일반 모드
npm start

# 개발 모드 (nodemon 사용)
npm run dev
```

서버는 `http://localhost:3000`에서 시작됩니다 (.env 파일에 지정된 PORT 사용).

## 사용 방법

### 웹 인터페이스

1. 브라우저에서 `http://localhost:3000` 접속
2. 하나 이상의 FCM 디바이스 토큰 입력
3. (선택사항) 메시지 JSON 커스터마이징
4. 토큰당 발송할 메시지 개수 설정
5. "발신하기" 버튼 클릭

### API 엔드포인트

#### 1. 헬스 체크
```
GET /health
```

서버와 FCM이 제대로 초기화되었는지 확인합니다.

**응답:**
```json
{
  "status": "ok",
  "fcmInitialized": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. 기본 메시지 템플릿 가져오기
```
GET /message-template
```

서버에서 사용하는 기본 메시지 템플릿을 반환합니다.

#### 3. 푸시 메시지 발신
```
POST /push
Content-Type: application/json
```

**요청 본문:**
```json
{
  "tokens": ["token1", "token2"],
  "messagesPerToken": 10,
  "message": {
    "notification": {
      "title": "테스트 알림",
      "body": "테스트 메시지입니다"
    },
    "data": {
      "key1": "value1",
      "key2": "value2"
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

**매개변수:**
- `tokens` (필수): FCM 디바이스 토큰 배열
- `messagesPerToken` (선택): 토큰당 발송할 메시지 개수 (기본값: 10, 최대: 100)
- `message` (선택): 커스텀 메시지 객체. 제공하지 않으면 기본 템플릿 사용.

**성공 응답:**
```json
{
  "success": true,
  "summary": {
    "totalTokens": 2,
    "messagesPerToken": 10,
    "totalMessages": 20,
    "successCount": 20,
    "failureCount": 0
  },
  "results": [
    {
      "token": "token1",
      "messageIndex": 1,
      "success": true,
      "messageId": "0:1234567890",
      "error": null
    }
  ],
  "sentAt": "2024-01-01T00:00:00.000Z"
}
```

## 메시지 커스터마이징

요청 본문의 `message` 객체는 모든 FCM 메시지 속성을 지원합니다:

- **notification**: 사용자에게 표시할 알림
  - `title`: 알림 제목
  - `body`: 알림 본문 텍스트

- **data**: 커스텀 키-값 쌍 (모든 값은 문자열로 변환됨)
  - 앱에 커스텀 데이터를 전송하는 데 사용
  - 앱이 백그라운드 상태일 때도 이 데이터를 처리할 수 있습니다

- **android**: Android 특정 옵션
  - `priority`: 메시지 우선순위 ("high" 또는 "normal")
  - `notification.sound`: 알림 사운드
  - `notification.channelId`: Android 알림 채널 ID

- **apns**: iOS 특정 옵션
  - iOS 알림 동작 구성

## 테스트 예시

### cURL 사용
```bash
curl -X POST http://localhost:3000/push \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["your-fcm-device-token"],
    "messagesPerToken": 5
  }'
```

### JavaScript (fetch) 사용
```javascript
fetch('http://localhost:3000/push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tokens: ['your-fcm-device-token'],
    messagesPerToken: 5,
    message: {
      notification: {
        title: '커스텀 제목',
        body: '커스텀 메시지 본문'
      },
      data: {
        eventId: '12345',
        type: 'custom_event'
      }
    }
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## 문제 해결

### FCM이 초기화되지 않음
- `.env` 파일이 올바르게 구성되었는지 확인
- Firebase 서비스 계정 JSON이 유효한지 확인
- 파일 경로(방법 1 사용 시)가 올바른지 확인

### 토큰 오류
- FCM 토큰이 유효하고 만료되지 않았는지 확인
- 토큰들이 같은 Firebase 프로젝트에서 발급되었는지 확인
- 앱이 FCM에 제대로 등록되었는지 확인

### 네트워크 오류
- 서버가 인터넷에 연결되어 있는지 확인
- 방화벽이 아웃바운드 연결을 차단하지 않는지 확인
- FCM 서비스가 차단되지 않았는지 확인

## 라이선스

MIT

</details>
