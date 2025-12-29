import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import { mediasoupConfig } from '../config/mediasoup.config';

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private workers: mediasoupTypes.Worker[] = [];
  private nextWorkerIndex = 0;
  private routers: Map<string, mediasoupTypes.Router> = new Map();

  async onModuleInit() {
    await this.createWorkers();
  }

  /**
   * mediasoup Worker 생성
   */
  private async createWorkers() {
    const { numWorkers, worker } = mediasoupConfig;

    for (let i = 0; i < numWorkers; i++) {
      const mediasoupWorker = await mediasoup.createWorker({
        logLevel: worker.logLevel,
        logTags: worker.logTags,
        rtcMinPort: worker.rtcMinPort,
        rtcMaxPort: worker.rtcMaxPort,
      });

      mediasoupWorker.on('died', () => {
        this.logger.error(
          `mediasoup Worker died, exiting in 2 seconds... [pid:${mediasoupWorker.pid}]`,
        );
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(mediasoupWorker);
      this.logger.log(`Worker created [pid:${mediasoupWorker.pid}]`);
    }

    this.logger.log(`${numWorkers} mediasoup Workers created`);
  }

  /**
   * 로드 밸런싱을 위한 다음 Worker 선택
   */
  private getNextWorker(): mediasoupTypes.Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  /**
   * Router 생성
   */
  async createRouter(roomId: string): Promise<mediasoupTypes.Router> {
    const worker = this.getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: mediasoupConfig.router.mediaCodecs,
    });

    this.routers.set(roomId, router);
    this.logger.log(`Router created for room: ${roomId}`);

    return router;
  }

  /**
   * Router 조회
   */
  getRouter(roomId: string): mediasoupTypes.Router | undefined {
    return this.routers.get(roomId);
  }

  /**
   * Router 삭제
   */
  async closeRouter(roomId: string): Promise<void> {
    const router = this.routers.get(roomId);
    if (router) {
      router.close();
      this.routers.delete(roomId);
      this.logger.log(`Router closed for room: ${roomId}`);
    }
  }

  /**
   * WebRTC Transport 생성
   */
  async createWebRtcTransport(
    router: mediasoupTypes.Router,
  ): Promise<mediasoupTypes.WebRtcTransport> {
    const { webRtcTransport } = mediasoupConfig;

    const transport = await router.createWebRtcTransport({
      listenIps: webRtcTransport.listenIps,
      enableUdp: webRtcTransport.enableUdp,
      enableTcp: webRtcTransport.enableTcp,
      preferUdp: webRtcTransport.preferUdp,
      initialAvailableOutgoingBitrate:
        webRtcTransport.initialAvailableOutgoingBitrate,
    });

    // 대역폭 제한 설정
    if (webRtcTransport.maxIncomingBitrate) {
      await transport.setMaxIncomingBitrate(
        webRtcTransport.maxIncomingBitrate,
      );
    }

    return transport;
  }

  /**
   * Worker 상태 조회
   */
  getWorkerStats() {
    return this.workers.map((worker) => ({
      pid: worker.pid,
      // resourceUsage: worker.resourceUsage, // 필요 시 추가
    }));
  }
}
