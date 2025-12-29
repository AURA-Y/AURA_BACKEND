import { Module, forwardRef } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { BotModule } from '../bot/bot.module';
import { MediaModule } from '../media/media.module';
import { PeerModule } from '../peer/peer.module';

@Module({
  imports: [
    MediaModule,
    PeerModule,
    forwardRef(() => BotModule),
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
