/**
 * Stores fallback map assets so the user still has a working map
 * if the external service stops responding.
 */
const CONFIG = {
  fortniteApiBase: 'https://fortnite-api.com',
  fallbackBlank: 'https://fortnite-api.com/images/map.png',
  fallbackPOIs: 'https://fortnite-api.com/images/map_en.png',
};

/**
 * Fetches the current game map using community api.
 */
export async function getMapImageUrl(labels: boolean): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${CONFIG.fortniteApiBase}/v1/map?language=en`, {
      mode: 'cors',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = (await response.json()) as {
        data?: { images?: { pois?: string; blank?: string } };
      };
      if (data?.data?.images) {
        const url = labels
          ? (data.data.images.pois ?? CONFIG.fallbackPOIs)
          : (data.data.images.blank ?? CONFIG.fallbackBlank);
        if (url) return url;
      }
    }
  } catch {
  } finally {
    clearTimeout(timeoutId);
  }
  return labels ? CONFIG.fallbackPOIs : CONFIG.fallbackBlank;
}
