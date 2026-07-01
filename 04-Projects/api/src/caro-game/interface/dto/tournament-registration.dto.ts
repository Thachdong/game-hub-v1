import { ApiProperty } from '@nestjs/swagger';

export class TournamentRegistrationResponseDto {
  @ApiProperty()
  registrationId: string;

  @ApiProperty()
  tournamentId: string;

  @ApiProperty()
  playerId: string;

  @ApiProperty()
  eloAtRegistration: number;

  @ApiProperty()
  tournamentPoints: number;

  @ApiProperty()
  winStreak: number;

  @ApiProperty({ enum: ['idle', 'in_match'] })
  status: string;

  @ApiProperty()
  registeredAt: Date;
}

export class TournamentParticipantDto {
  @ApiProperty()
  rank: number;

  @ApiProperty()
  registrationId: string;

  @ApiProperty()
  playerId: string;

  @ApiProperty()
  tournamentPoints: number;

  @ApiProperty()
  winStreak: number;

  @ApiProperty({ enum: ['idle', 'in_match'] })
  status: string;

  @ApiProperty()
  eloAtRegistration: number;

  @ApiProperty()
  registeredAt: Date;
}
