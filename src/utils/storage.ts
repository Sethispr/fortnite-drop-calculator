import localforage from 'localforage';

/**
 * Saves the chosen drop spot to browser storage so the user does not
 * have to pick it again when they reopen the website.
 */
export async function saveTargetPoint(x: number, y: number) {
  await localforage.setItem('savedTarget', { x, y });
}

/**
 * Get the player's last saved drop spot from browser storage.
 */
export async function loadTargetPoint(): Promise<{ x: number; y: number } | null> {
  try {
    return await localforage.getItem<{ x: number; y: number }>('savedTarget');
  } catch {
    return null;
  }
}
