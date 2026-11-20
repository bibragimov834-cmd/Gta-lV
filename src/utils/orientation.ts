export function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function isCompactLandscapeViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight && window.innerHeight <= 560;
}

/**
 * Attempts to lock screen orientation to landscape (supporting both
 * landscape-primary / Landscape Left and landscape-secondary / Landscape Right)
 * via the Screen Orientation API when running on mobile devices.
 * Gracefully no-ops on desktop or browsers that restrict orientation locking.
 */
export async function requestLandscapeOrientation(): Promise<boolean> {
  if (typeof window === 'undefined' || !isMobileTouchDevice()) return false;

  const orientation = window.screen?.orientation as
    | (ScreenOrientation & { lock?: (orientation: string) => Promise<void> })
    | undefined;

  if (!orientation || typeof orientation.lock !== 'function') {
    return false;
  }

  try {
    await orientation.lock('landscape');
    return true;
  } catch {
    // Expected on non-fullscreen mobile tabs, iOS Safari, or restricted WebViews
    return false;
  }
}

export function releaseOrientationLock(): void {
  if (typeof window === 'undefined') return;
  const orientation = window.screen?.orientation;
  try {
    if (orientation && typeof orientation.unlock === 'function') {
      orientation.unlock();
    }
  } catch {
    // Ignore when unlock is unsupported or not locked
  }
}
