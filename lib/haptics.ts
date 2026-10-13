import * as Haptics from 'expo-haptics';

/** Fire-and-forget wrappers so a missing haptic engine never surfaces as an error. */

export function hapticCell(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticCheckpoint(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticWin(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
