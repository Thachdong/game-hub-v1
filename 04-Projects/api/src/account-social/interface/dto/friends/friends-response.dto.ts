import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestRecordDto } from './friend-request-record.dto';

export class FriendProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  avatarUrl: string;
}

export class FriendsResponseDto {
  @ApiProperty({ type: [FriendProfileDto] })
  friends: FriendProfileDto[];
}

export class FriendRequestsResponseDto {
  @ApiProperty({ type: [FriendRequestRecordDto] })
  incoming: FriendRequestRecordDto[];

  @ApiProperty({ type: [FriendRequestRecordDto] })
  outgoing: FriendRequestRecordDto[];
}
