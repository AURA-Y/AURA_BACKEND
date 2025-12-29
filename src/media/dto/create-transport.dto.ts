import { IsBoolean, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTransportDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsBoolean()
  @IsOptional()
  producing?: boolean;
}
