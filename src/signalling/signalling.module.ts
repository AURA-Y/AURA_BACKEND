import { Module } from '@nestjs/common';
import { SignallingGateway } from './signalling.gateway';
import { RoomModule } from '../room/room.module';
import { PeerModule } from '../peer/peer.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [RoomModule, PeerModule, MediaModule],
  providers: [SignallingGateway],
})
export class SignallingModule {}
