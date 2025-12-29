import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomResponse {
  @ApiProperty({
    description: '생성된 방 ID',
    example: 'room-d0340570-f900-469c-a4a5-63eeacba83dc',
  })
  roomId: string;

  @ApiProperty({
    description: '방 접속 URL',
    example: 'http://localhost:3000/room/room-d0340570-f900-469c-a4a5-63eeacba83dc',
  })
  roomUrl: string;

  @ApiProperty({
    description: '방 제목',
    example: '개발자 회의방',
  })
  roomTitle: string;

  @ApiProperty({
    description: '방 설명',
    example: '오후 3시 스프린트 미팅',
  })
  description: string;

  @ApiProperty({
    description: '최대 참여 인원',
    example: 10,
  })
  maxParticipants: number;

  @ApiProperty({
    description: '사용자 이름',
    example: '김철수',
  })
  userName: string;

  @ApiProperty({
    description: '접근 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
