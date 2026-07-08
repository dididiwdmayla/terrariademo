import { CAMERA_ZOOM } from "../config";

export class Camera {
  x = 0;
  y = 0;
  zoom = CAMERA_ZOOM;

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom,
    };
  }

  centerOn(worldX: number, worldY: number, viewportWidth: number, viewportHeight: number): void {
    this.x = worldX - viewportWidth / (2 * this.zoom);
    this.y = worldY - viewportHeight / (2 * this.zoom);
  }
}
