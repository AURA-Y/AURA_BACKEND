import { Module } from '@nestjs/common';
import { PeerService } from './peer.service';

@Module({
  providers: [PeerService],
  exports: [PeerService],
})
export class PeerModule {}
