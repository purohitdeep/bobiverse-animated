/**
 * Scene quality and effect settings.
 *
 * The spatial view is the most expensive thing the atlas can draw, and it is
 * also optional: the directory carries the same information. So the effects
 * degrade rather than being mandatory, and the reader's choice is remembered.
 */

export type SceneQuality = "high" | "balanced" | "low";

export interface SceneCapabilities {
  hardwareConcurrency: number | undefined;
  maxTouchPoints: number;
  webgl2: boolean;
}

export interface SceneSettings {
  quality: SceneQuality;
  /** Bloom and the tone-mapping composer. */
  postProcessing: boolean;
  /** Seeded deep field and galactic band. */
  backdrop: boolean;
  /** Distance reference rings. */
  rings: boolean;
}

export const SCENE_SETTINGS_STORAGE_KEY = "bobiverse:scene-settings";

export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  quality: "balanced",
  postProcessing: true,
  backdrop: true,
  rings: true,
};

/**
 * Chooses a starting tier from what the device reports.
 *
 * Core counts are the strongest available signal, and touch plus a small
 * screen is treated as a proxy for a phone. WebGL2 is required for the
 * composer, so a device without it cannot run the high tier at all.
 */
export function detectSceneQuality(capabilities: SceneCapabilities): SceneQuality {
  const { hardwareConcurrency, maxTouchPoints, webgl2 } = capabilities;
  if (!webgl2) {
    return "low";
  }
  const cores = hardwareConcurrency ?? 4;
  const looksMobile = maxTouchPoints > 0 && cores <= 6;
  if (looksMobile || cores <= 2) {
    return "low";
  }
  if (cores <= 4) {
    return "balanced";
  }
  return "high";
}

/** Post-processing is only offered where the composer can actually run. */
export function supportsPostProcessing(capabilities: SceneCapabilities): boolean {
  return capabilities.webgl2 && detectSceneQuality(capabilities) !== "low";
}

export function readDeviceCapabilities(): SceneCapabilities {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { hardwareConcurrency: undefined, maxTouchPoints: 0, webgl2: false };
  }
  let webgl2: boolean;
  try {
    const canvas = document.createElement("canvas");
    webgl2 = Boolean(canvas.getContext("webgl2"));
  } catch {
    webgl2 = false;
  }
  return {
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    webgl2,
  };
}

export function readSceneSettings(): SceneSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_SCENE_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(SCENE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SCENE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SceneSettings>;
    return {
      ...DEFAULT_SCENE_SETTINGS,
      ...parsed,
    };
  } catch {
    // A corrupt or blocked store must never stop the scene from rendering.
    return DEFAULT_SCENE_SETTINGS;
  }
}

export function writeSceneSettings(settings: SceneSettings): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      SCENE_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Private browsing or a full quota: settings simply do not persist.
  }
}

/**
 * Initial settings: the reader's stored preference, clamped to what this
 * device can actually run. A saved "effects on" must not force the composer
 * onto a machine that cannot use it.
 */
export function resolveInitialSceneSettings(
  stored: SceneSettings = readSceneSettings(),
  capabilities: SceneCapabilities = readDeviceCapabilities(),
): SceneSettings {
  return {
    ...stored,
    postProcessing: stored.postProcessing && supportsPostProcessing(capabilities),
  };
}
