/**
 * Helper to build Quran URLs while preserving query parameters
 */
export function buildQuranUrl(
  path: string,
  currentParams?: URLSearchParams,
  additionalParams?: Record<string, string>
): string {
  const params = new URLSearchParams(currentParams);

  // Add any additional params
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
