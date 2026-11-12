type AudioContextConstructor = new () => AudioContext;

/**
 * Tạo (lần đầu) và mở AudioContext; phải gọi đồng bộ trong handler chạm/phím vì Safari iOS chặn âm thanh
 * không gắn với thao tác người dùng. Trả null khi trình duyệt không có Web Audio.
 */
export function unlockAudioContext(existing: AudioContext | null): AudioContext | null {
  let context = existing;
  if (context === null) {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (AudioContextClass === undefined) return null;
    context = new AudioContextClass();
  }
  // Trình duyệt có thể từ chối mở âm thanh (chưa có thao tác người dùng); khi đó im lặng, lần chạm sau thử lại.
  if (context.state === 'suspended') context.resume().catch(() => undefined);
  return context;
}
