import type { DrawinkTextContainer } from "./types";

export const originalContainerCache: {
  [id: DrawinkTextContainer["id"]]:
    | {
        height: DrawinkTextContainer["height"];
      }
    | undefined;
} = {};

export const updateOriginalContainerCache = (
  id: DrawinkTextContainer["id"],
  height: DrawinkTextContainer["height"],
) => {
  let data = originalContainerCache[id];
  if (!data) {
    data = { height };
    originalContainerCache[id] = data;
  }
  data.height = height;
  return data;
};

export const resetOriginalContainerCache = (id: DrawinkTextContainer["id"]) => {
  if (originalContainerCache[id]) {
    delete originalContainerCache[id];
  }
};

export const getOriginalContainerHeightFromCache = (id: DrawinkTextContainer["id"]) => {
  return originalContainerCache[id]?.height ?? null;
};
