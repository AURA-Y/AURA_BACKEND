import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRouterDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
