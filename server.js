require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// FCM 초기화
let initialized = false;
try {
  // 방법 1: JSON 파일 경로로 초기화
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    initialized = true;
    console.log('✅ FCM 초기화 완료 (JSON 파일 경로 사용)');
  }
  // 방법 2: 환경 변수에서 서비스 계정 정보를 읽어서 초기화
  else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    initialized = true;
    console.log('✅ FCM 초기화 완료 (환경 변수 JSON 사용)');
  }
  // 방법 3: 개별 환경 변수로 초기화
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    });
    initialized = true;
    console.log('✅ FCM 초기화 완료 (개별 환경 변수 사용)');
  } else {
    console.warn('⚠️  FCM 초기화 실패: 환경 변수를 확인해주세요.');
  }
} catch (error) {
  console.error('❌ FCM 초기화 오류:', error.message);
}

// 미리 준비된 푸시 메시지 JSON 템플릿
const defaultPushMessage = {
  notification: {
    title: '테스트 알림',
    body: '안드로이드 푸시 메시지 테스트입니다.',
  },
  data: {
    type: 'test',
    timestamp: new Date().toISOString(),
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'default',
    },
  },
};

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    fcmInitialized: initialized,
    timestamp: new Date().toISOString(),
  });
});

// 기본 메시지 템플릿 반환 엔드포인트
app.get('/message-template', (req, res) => {
  res.json(defaultPushMessage);
});

// 푸시 메시지 발신 엔드포인트
app.post('/push', async (req, res) => {
  if (!initialized) {
    return res.status(500).json({
      success: false,
      error: 'FCM이 초기화되지 않았습니다. 환경 변수를 확인해주세요.',
    });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'push token이 필요합니다.',
    });
  }

  try {
    let message;
    
    // 커스텀 메시지가 제공되면 전체를 사용, 아니면 기본 메시지 사용
    if (req.body.message && typeof req.body.message === 'object') {
      // 커스텀 메시지 사용 (token은 제외하고 병합)
      const { token: _, ...customMessage } = req.body.message;
      message = {
        ...defaultPushMessage,
        ...customMessage,
        token: token,
      };
    } else {
      // 기본 메시지 사용
      message = {
        ...defaultPushMessage,
        token: token,
      };
    }

    // FCM으로 메시지 발신
    const response = await admin.messaging().send(message);
    
    console.log('✅ 푸시 메시지 발신 성공:', response);
    
    res.json({
      success: true,
      messageId: response,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 푸시 메시지 발신 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// 루트 경로에서 웹페이지 제공
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌐 웹페이지: http://localhost:${PORT}/`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Push endpoint: http://localhost:${PORT}/push`);
});

