/** Điểm sáng đọc toạ độ mỗi khung (getter) hoặc cố định. */
export interface LightSource {
  readonly x: number;
  readonly y: number;
}

/** Lớp không khí của scene mà bản đồ, sân trận và quái lang thang dùng chung. */
export interface SceneAtmosphere {
  addLight(source: LightSource, radius: number, flicker?: boolean): void;
  /** Gỡ vùng sáng đã thêm bằng đúng đối tượng `source`. */
  removeLight(source: LightSource): void;
  /** Tắt giữa chừng khi máy tụt fps. */
  disable(): void;
}
