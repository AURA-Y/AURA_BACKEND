import { types as mediasoupTypes } from 'mediasoup';

export class Room {
  id: string;
  name: string;
  maxParticipants: number;
  router: mediasoupTypes.Router;
  peers: Map<string, any>; // peerId -> Peer
  createdAt: Date;

  constructor(
    id: string,
    name: string,
    router: mediasoupTypes.Router,
    maxParticipants = 5,
  ) {
    this.id = id;
    this.name = name;
    this.router = router;
    this.maxParticipants = maxParticipants;
    this.peers = new Map();
    this.createdAt = new Date();
  }

  addPeer(peerId: string, peer: any) {
    this.peers.set(peerId, peer);
  }

  removePeer(peerId: string) {
    this.peers.delete(peerId);
  }

  getPeer(peerId: string) {
    return this.peers.get(peerId);
  }

  getAllPeers() {
    return Array.from(this.peers.values());
  }

  getPeerCount() {
    return this.peers.size;
  }

  isFull() {
    return this.peers.size >= this.maxParticipants;
  }
}
