import { PLAYER_WIDTH, PLAYER_HEIGHT } from "../config";

export class Player {
  x = 0;
  y = 0;
  velocityX = 0;
  velocityY = 0;
  readonly width = PLAYER_WIDTH;
  readonly height = PLAYER_HEIGHT;
}
