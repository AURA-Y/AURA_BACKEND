import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateRouterDto } from './dto/create-router.dto';
import { CreateTransportDto } from './dto/create-transport.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Router 생성
   * POST /media/router
   */
  @Post('router')
  @HttpCode(HttpStatus.CREATED)
  async createRouter(@Body() dto: CreateRouterDto) {
    const router = await this.mediaService.createRouter(dto.roomId);

    return {
      roomId: dto.roomId,
      rtpCapabilities: router.rtpCapabilities,
    };
  }

  /**
   * Router RTP Capabilities 조회
   * GET /media/router/:roomId
   */
  @Get('router/:roomId')
  getRouterCapabilities(@Param('roomId') roomId: string) {
    const router = this.mediaService.getRouter(roomId);

    if (!router) {
      throw new NotFoundException(`Router for room '${roomId}' not found`);
    }

    return {
      roomId,
      rtpCapabilities: router.rtpCapabilities,
    };
  }

  /**
   * Router 삭제
   * DELETE /media/router/:roomId
   */
  @Delete('router/:roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRouter(@Param('roomId') roomId: string) {
    await this.mediaService.closeRouter(roomId);
  }

  /**
   * WebRTC Transport 생성
   * POST /media/transport
   */
  @Post('transport')
  @HttpCode(HttpStatus.CREATED)
  async createTransport(@Body() dto: CreateTransportDto) {
    const router = this.mediaService.getRouter(dto.roomId);

    if (!router) {
      throw new NotFoundException(`Router for room '${dto.roomId}' not found`);
    }

    const transport = await this.mediaService.createWebRtcTransport(router);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  /**
   * Worker 상태 조회
   * GET /media/workers
   */
  @Get('workers')
  getWorkerStats() {
    return {
      workers: this.mediaService.getWorkerStats(),
    };
  }

  /**
   * Health check
   * GET /media/health
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
