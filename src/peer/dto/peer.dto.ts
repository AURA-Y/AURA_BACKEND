export class PeerDto {
  id: string;
  displayName: string;
  producerIds: string[];

  // peer 사용자 정보
  // 사용자 id, 화면 정보, 공급자 id(주최자)
  constructor(peer: any) {
    this.id = peer.id;
    this.displayName = peer.displayName;
    this.producerIds = Array.from(peer.producers.keys());
  }
}
