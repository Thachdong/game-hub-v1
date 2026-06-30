export type BoardSize = '18x18' | '25x25' | '40x40';
export type MoveTimeSeconds = 5 | 10 | 15 | 25 | 35 | 45 | 60;

export const VALID_BOARD_SIZES: BoardSize[] = ['18x18', '25x25', '40x40'];
export const VALID_MOVE_TIMES: MoveTimeSeconds[] = [5, 10, 15, 25, 35, 45, 60];

export class GameConfig {
  id: string;
  boardSize: BoardSize;
  moveTimeSeconds: MoveTimeSeconds;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deactivatedBy: string | null;
  deactivatedAt: Date | null;
}
