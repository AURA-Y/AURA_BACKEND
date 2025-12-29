import { IsString, IsObject } from 'class-validator';

export class ConsumeDto {
  @IsString()
  transportId: string;

  @IsString()
  producerId: string;

  @IsObject()
  rtpCapabilities: any;
}
