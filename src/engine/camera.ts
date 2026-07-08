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

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y,
    };
  }

  centerOn(worldX: number, worldY: number, viewportWidth: number, viewportHeight: number): void {
    this.x = worldX - viewportWidth / (2 * this.zoom);
    this.y = worldY - viewportHeight / (2 * this.zoom);
  }

  // segue um alvo com suavização exponencial (alpha em [0,1] por step)
  follow(worldX: number, worldY: number, viewportWidth: number, viewportHeight: number, alpha: number): void {
    const targetX = worldX - viewportWidth / (2 * this.zoom);
    const targetY = worldY - viewportHeight / (2 * this.zoom);
    this.x += (targetX - this.x) * alpha;
    this.y += (targetY - this.y) * alpha;
  }

  clampToWorld(worldPxWidth: number, worldPxHeight: number, viewportWidth: number, viewportHeight: number): void {
    const viewW = viewportWidth / this.zoom;
    const viewH = viewportHeight / this.zoom;
    this.x = Math.max(0, Math.min(this.x, worldPxWidth - viewW));
    this.y = Math.max(0, Math.min(this.y, worldPxHeight - viewH));
  }
}
