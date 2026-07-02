import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty() rank: number;
  @ApiProperty() playerId: string;
  @ApiProperty() elo: number;
  @ApiProperty() matchesPlayed: number;
  @ApiProperty() wins: number;
  @ApiProperty() losses: number;
  @ApiProperty() draws: number;
  @ApiProperty() winRate: number;
}

export class LeaderboardResponseDto {
  @ApiProperty({ type: [LeaderboardEntryDto] }) entries: LeaderboardEntryDto[];
}
