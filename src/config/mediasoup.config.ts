import { types as mediasoupTypes } from 'mediasoup';
import * as os from 'os';

export const mediasoupConfig = {
  // Worker settings (환경변수로 조절 가능, 기본값: CPU 코어 수)
  numWorkers: process.env.MEDIASOUP_WORKERS
    ? parseInt(process.env.MEDIASOUP_WORKERS, 10)
    : Object.keys(os.cpus()).length,

  worker: {
    rtcMinPort: parseInt(process.env.MEDIASOUP_RTC_MIN_PORT || '10000', 10),
    rtcMaxPort: parseInt(process.env.MEDIASOUP_RTC_MAX_PORT || '59999', 10),
    logLevel: 'warn' as mediasoupTypes.WorkerLogLevel,
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ] as mediasoupTypes.WorkerLogTag[],
  },

  // Router settings
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        parameters: {
          // 고품질 오디오 설정
          useinbandfec: 1,           // Forward Error Correction 활성화
          usedtx: 0,                 // DTX 비활성화 (품질 우선)
          maxaveragebitrate: 128000, // 최대 비트레이트 128kbps (고품질)
          stereo: 1,                 // 스테레오 활성화
          spropstereo: 1,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
        },
      },
    ] as any,
  },

  // WebRTC transport settings
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    maxIncomingBitrate: 1500000,
  },
};
