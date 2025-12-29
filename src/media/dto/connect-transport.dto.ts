import { IsString, IsObject } from 'class-validator';

export class ConnectTransportDto {
  @IsString()
  transportId: string;

  @IsObject()
  dtlsParameters: any;
}
