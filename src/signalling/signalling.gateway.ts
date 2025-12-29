import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../room/room.service';
import { PeerService } from '../peer/peer.service';
import { MediaService } from '../media/media.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { PeerDto } from '../peer/dto/peer.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignallingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignallingGateway.name);
  private socketRoomMap: Map<string, string> = new Map(); // socketId -> roomId
  private socketPeerMap: Map<string, string> = new Map(); // socketId -> peerId

  constructor(
    private readonly roomService: RoomService,
    private readonly peerService: PeerService,
    private readonly mediaService: MediaService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const peerId = this.socketPeerMap.get(client.id);
    const roomId = this.socketRoomMap.get(client.id);

    if (peerId && roomId) {
      // Peer를 방에서 제거
      this.roomService.removePeerFromRoom(roomId, peerId);
      this.peerService.removePeer(peerId);

      // 다른 참가자들에게 알림
      client.to(roomId).emit('peer-left', { peerId });

      this.socketPeerMap.delete(client.id);
      this.socketRoomMap.delete(client.id);
    }
  }

  /**
   * 방 참가
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    try {
      const { roomId, displayName } = data;
      const peerId = client.id;

      // 방 존재 확인, 없으면 자동 생성
      let room;
      try {
        room = this.roomService.getRoom(roomId);
      } catch (error) {
        // 방이 없으면 자동 생성
        await this.roomService.createRoom(
          {
            userName: displayName || 'Anonymous',
            roomTitle: roomId,
            maxParticipants: 5,
          },
          roomId, // customId로 roomId 전달
        );
        room = this.roomService.getRoom(roomId);
      }

      // Peer 생성
      const peer = this.peerService.createPeer(peerId, displayName, roomId);

      // 방에 Peer 추가
      this.roomService.addPeerToRoom(roomId, peerId, peer);

      // Socket을 방에 참가
      client.join(roomId);

      this.socketPeerMap.set(client.id, peerId);
      this.socketRoomMap.set(client.id, roomId);

      // 기존 참가자 목록 가져오기
      const otherPeers = this.peerService
        .getPeersByRoom(roomId)
        .filter((p) => p.id !== peerId)
        .map((p) => new PeerDto(p));

      // 새 참가자에게 응답
      client.emit('joined-room', {
        peerId,
        peers: otherPeers,
      });

      // 다른 참가자들에게 새 참가자 알림
      client.to(roomId).emit('new-peer', {
        peer: new PeerDto(peer),
      });

      this.logger.log(`Peer ${peerId} joined room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Router RTP Capabilities 요청
   */
  @SubscribeMessage('get-router-rtp-capabilities')
  async handleGetRouterRtpCapabilities(
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const roomId = this.socketRoomMap.get(client.id);
      if (!roomId) {
        throw new Error('Not in a room');
      }

      // Room에서 Router의 RTP Capabilities 가져오기 (통합 서버)
      const room = this.roomService.getRoom(roomId);
      return { rtpCapabilities: room.router.rtpCapabilities };
    } catch (error) {
      this.logger.error(`Error getting RTP capabilities: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * WebRTC Transport 생성
   */
  @SubscribeMessage('create-webrtc-transport')
  async handleCreateWebRtcTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const roomId = this.socketRoomMap.get(client.id);
      const peerId = this.socketPeerMap.get(client.id);

      if (!roomId || !peerId) {
        throw new Error('Not in a room');
      }

      // Room의 Router로 Transport 생성 (통합 서버)
      const room = this.roomService.getRoom(roomId);
      const transport = await this.mediaService.createWebRtcTransport(
        room.router,
      );

      // Peer 엔티티에 Transport 저장
      const peer = this.peerService.getPeer(peerId);
      peer.addTransport(transport);

      this.logger.log(
        `Transport created: ${transport.id} for peer ${peerId}`,
      );

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      this.logger.error(`Error creating transport: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Transport 연결
   */
  @SubscribeMessage('connect-transport')
  async handleConnectTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const peerId = this.socketPeerMap.get(client.id);
      if (!peerId) {
        throw new Error('Not in a room');
      }

      const peer = this.peerService.getPeer(peerId);
      const transport = peer.getTransport(data.transportId);

      if (!transport) {
        throw new Error('Transport not found');
      }

      await transport.connect({ dtlsParameters: data.dtlsParameters });

      this.logger.log(`Transport connected: ${data.transportId}`);
      return { connected: true };
    } catch (error) {
      this.logger.error(`Error connecting transport: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Producer 생성 (미디어 전송)
   */
  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const peerId = this.socketPeerMap.get(client.id);
      const roomId = this.socketRoomMap.get(client.id);

      if (!peerId || !roomId) {
        throw new Error('Not in a room');
      }

      const peer = this.peerService.getPeer(peerId);
      const transport = peer.getTransport(data.transportId);

      if (!transport) {
        throw new Error('Transport not found');
      }

      // Producer 생성
      const producer = await transport.produce({
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });

      peer.addProducer(producer);

      // 다른 참가자들에게 새 Producer 알림
      client.to(roomId).emit('new-producer', {
        peerId,
        producerId: producer.id,
        kind: producer.kind,
      });

      this.logger.log(
        `Producer created: ${producer.id} (${data.kind}) for peer ${peerId}`,
      );

      return { id: producer.id };
    } catch (error) {
      this.logger.error(`Error creating producer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Consumer 생성 (미디어 수신)
   */
  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const peerId = this.socketPeerMap.get(client.id);
      const roomId = this.socketRoomMap.get(client.id);

      if (!peerId || !roomId) {
        throw new Error('Not in a room');
      }

      const room = this.roomService.getRoom(roomId);
      const peer = this.peerService.getPeer(peerId);
      const transport = peer.getTransport(data.transportId);

      if (!transport) {
        throw new Error('Transport not found');
      }

      // Router가 Consumer를 생성할 수 있는지 확인
      if (
        !room.router.canConsume({
          producerId: data.producerId,
          rtpCapabilities: data.rtpCapabilities,
        })
      ) {
        throw new Error('Cannot consume');
      }

      // Consumer 생성
      const consumer = await transport.consume({
        producerId: data.producerId,
        rtpCapabilities: data.rtpCapabilities,
        paused: true, // 처음에는 일시정지 상태로 시작
      });

      peer.addConsumer(consumer);

      this.logger.log(
        `Consumer created: ${consumer.id} for peer ${peerId}`,
      );

      return {
        id: consumer.id,
        producerId: data.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      this.logger.error(`Error creating consumer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Consumer 재개
   */
  @SubscribeMessage('resume-consumer')
  async handleResumeConsumer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consumerId: string },
  ) {
    try {
      const peerId = this.socketPeerMap.get(client.id);
      if (!peerId) {
        throw new Error('Not in a room');
      }

      const peer = this.peerService.getPeer(peerId);
      const consumer = peer.getConsumer(data.consumerId);

      if (!consumer) {
        throw new Error('Consumer not found');
      }

      await consumer.resume();

      this.logger.log(`Consumer resumed: ${data.consumerId}`);
      return { resumed: true };
    } catch (error) {
      this.logger.error(`Error resuming consumer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Producer 일시정지
   */
  @SubscribeMessage('pause-producer')
  async handlePauseProducer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { producerId: string },
  ) {
    try {
      const peerId = this.socketPeerMap.get(client.id);
      const roomId = this.socketRoomMap.get(client.id);

      if (!peerId || !roomId) {
        throw new Error('Not in a room');
      }

      const peer = this.peerService.getPeer(peerId);
      const producer = peer.getProducer(data.producerId);

      if (!producer) {
        throw new Error('Producer not found');
      }

      await producer.pause();

      // 다른 참가자들에게 알림
      client.to(roomId).emit('producer-paused', {
        peerId,
        producerId: data.producerId,
      });

      this.logger.log(`Producer paused: ${data.producerId}`);
      return { paused: true };
    } catch (error) {
      this.logger.error(`Error pausing producer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Producer 재개
   */
  @SubscribeMessage('resume-producer')
  async handleResumeProducer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { producerId: string },
  ) {
    try {
      const peerId = this.socketPeerMap.get(client.id);
      const roomId = this.socketRoomMap.get(client.id);

      if (!peerId || !roomId) {
        throw new Error('Not in a room');
      }

      const peer = this.peerService.getPeer(peerId);
      const producer = peer.getProducer(data.producerId);

      if (!producer) {
        throw new Error('Producer not found');
      }

      await producer.resume();

      // 다른 참가자들에게 알림
      client.to(roomId).emit('producer-resumed', {
        peerId,
        producerId: data.producerId,
      });

      this.logger.log(`Producer resumed: ${data.producerId}`);
      return { resumed: true };
    } catch (error) {
      this.logger.error(`Error resuming producer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }
}
