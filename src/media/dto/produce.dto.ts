import { IsString, IsObject } from 'class-validator';

export class ProduceDto {
  @IsString()
  transportId: string;

  @IsString()
  kind: 'audio' | 'video';

  @IsObject()
  rtpParameters: any;

  @IsString()
  appData?: any;
}
