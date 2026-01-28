import throttle from "lodash.throttle";

import { arrayToMap, isDevEnv, isTestEnv } from "@/lib/common";

import {
  orderByFractionalIndex,
  syncInvalidIndices,
  validateFractionalIndices,
} from "@/lib/elements";

import type { OrderedDrawinkElement } from "@/lib/elements/types";

import type { MakeBrand } from "@/lib/common/utility-types";

import type { AppState } from "../types";

export type ReconciledDrawinkElement = OrderedDrawinkElement &
  MakeBrand<"ReconciledElement">;

export type RemoteDrawinkElement = OrderedDrawinkElement &
  MakeBrand<"RemoteDrawinkElement">;

export const shouldDiscardRemoteElement = (
  localAppState: AppState,
  local: OrderedDrawinkElement | undefined,
  remote: RemoteDrawinkElement,
): boolean => {
  if (
    local &&
    // local element is being edited
    (local.id === localAppState.editingTextElement?.id ||
      local.id === localAppState.resizingElement?.id ||
      local.id === localAppState.newElement?.id ||
      // local element is newer
      local.version > remote.version ||
      // resolve conflicting edits deterministically by taking the one with
      // the lowest versionNonce
      (local.version === remote.version &&
        local.versionNonce < remote.versionNonce))
  ) {
    return true;
  }
  return false;
};

const validateIndicesThrottled = throttle(
  (
    orderedElements: readonly OrderedDrawinkElement[],
    localElements: readonly OrderedDrawinkElement[],
    remoteElements: readonly RemoteDrawinkElement[],
  ) => {
    if (isDevEnv() || isTestEnv() || window?.DEBUG_FRACTIONAL_INDICES) {
      // create new instances due to the mutation
      const elements = syncInvalidIndices(
        orderedElements.map((x) => ({ ...x })),
      );

      validateFractionalIndices(elements, {
        // throw in dev & test only, to remain functional on `DEBUG_FRACTIONAL_INDICES`
        shouldThrow: isTestEnv() || isDevEnv(),
        includeBoundTextValidation: true,
        reconciliationContext: {
          localElements,
          remoteElements,
        },
      });
    }
  },
  1000 * 60,
  { leading: true, trailing: false },
);

export const reconcileElements = (
  localElements: readonly OrderedDrawinkElement[],
  remoteElements: readonly RemoteDrawinkElement[],
  localAppState: AppState,
): ReconciledDrawinkElement[] => {
  const localElementsMap = arrayToMap(localElements);
  const reconciledElements: OrderedDrawinkElement[] = [];
  const added = new Set<string>();

  // process remote elements
  for (const remoteElement of remoteElements) {
    if (!added.has(remoteElement.id)) {
      const localElement = localElementsMap.get(remoteElement.id);
      const discardRemoteElement = shouldDiscardRemoteElement(
        localAppState,
        localElement,
        remoteElement,
      );

      if (localElement && discardRemoteElement) {
        reconciledElements.push(localElement);
        added.add(localElement.id);
      } else {
        reconciledElements.push(remoteElement);
        added.add(remoteElement.id);
      }
    }
  }

  // process remaining local elements
  for (const localElement of localElements) {
    if (!added.has(localElement.id)) {
      reconciledElements.push(localElement);
      added.add(localElement.id);
    }
  }

  const orderedElements = orderByFractionalIndex(reconciledElements);

  validateIndicesThrottled(orderedElements, localElements, remoteElements);

  // de-duplicate indices
  syncInvalidIndices(orderedElements);

  return orderedElements as ReconciledDrawinkElement[];
};
