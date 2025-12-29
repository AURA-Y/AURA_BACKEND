import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Peer } from './entities/peer.entity';

@Injectable()
export class PeerService {
  private readonly logger = new Logger(PeerService.name);
  private peers: Map<string, Peer> = new Map();

  /**
   * Peer 생성
   */
  createPeer(peerId: string, displayName: string, roomId: string): Peer {
    const peer = new Peer(peerId, displayName, roomId);
    this.peers.set(peerId, peer);
    this.logger.log(`Peer created: ${peerId} - ${displayName} in room ${roomId}`);
    return peer;
  }

  /**
   * Peer 조회
   */
  getPeer(peerId: string): Peer {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new NotFoundException(`Peer not found: ${peerId}`);
    }
    return peer;
  }

  /**
   * Peer 존재 여부 확인
   */
  hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }

  /**
   * Peer 삭제
   */
  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
      this.logger.log(`Peer removed: ${peerId}`);
    }
  }

  /**
   * 특정 방의 모든 Peer 조회
   */
  getPeersByRoom(roomId: string): Peer[] {
    return Array.from(this.peers.values()).filter(
      (peer) => peer.roomId === roomId,
    );
  }
}
