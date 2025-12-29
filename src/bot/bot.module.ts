import { Module, forwardRef } from "@nestjs/common";
import { BotController } from "./bot.controller";
import { BotService } from "./bot.service";
import { RoomModule } from "../room/room.module";

@Module({
  imports: [forwardRef(() => RoomModule)],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
