import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: '사용자명',
    example: 'testuser',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'password123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
