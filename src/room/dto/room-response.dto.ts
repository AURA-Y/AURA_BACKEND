export class RoomResponseDto {
  id: string;
  name: string;
  maxParticipants: number;
  currentParticipants: number;
  createdAt: Date;

  constructor(room: any) {
    this.id = room.id;
    this.name = room.name;
    this.maxParticipants = room.maxParticipants;
    this.currentParticipants = room.getPeerCount();
    this.createdAt = room.createdAt;
  }
}
