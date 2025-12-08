import {
  clearAppStateForLocalStorage,
  getDefaultAppState,
} from "@drawink/drawink/appState";

import type { DrawinkElement } from "@drawink/element/types";
import type { AppState } from "@drawink/drawink/types";

import { STORAGE_KEYS } from "../app_constants";

export const saveUsernameToLocalStorage = (username: string) => {
  try {
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_COLLAB,
      JSON.stringify({ username }),
    );
  } catch (error: any) {
    // Unable to access window.localStorage
    console.error(error);
  }
};

export const importUsernameFromLocalStorage = (): string | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_COLLAB);
    if (data) {
      return JSON.parse(data).username;
    }
  } catch (error: any) {
    // Unable to access localStorage
    console.error(error);
  }

  return null;
};

export const importFromLocalStorage = () => {
  let savedElements = null;
  let savedState = null;

  try {
    const currentBoardId = localStorage.getItem(
      STORAGE_KEYS.LOCAL_STORAGE_CURRENT_BOARD_ID,
    );
    const elementsKey = currentBoardId
      ? `drawink-board-${currentBoardId}-elements`
      : STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS;
    const stateKey = currentBoardId
      ? `drawink-board-${currentBoardId}-state`
      : STORAGE_KEYS.LOCAL_STORAGE_APP_STATE;

    savedElements = localStorage.getItem(elementsKey);
    savedState = localStorage.getItem(stateKey);

    // Migration: If no boards exist, create a default one with current data
    const boards = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS);
    if (!boards || JSON.parse(boards).length === 0) {
      const defaultBoard = {
        id: "default",
        name: "Default Board",
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      localStorage.setItem(
        STORAGE_KEYS.LOCAL_STORAGE_BOARDS,
        JSON.stringify([defaultBoard]),
      );
      localStorage.setItem(
        STORAGE_KEYS.LOCAL_STORAGE_CURRENT_BOARD_ID,
        defaultBoard.id,
      );
      // Save current data to default board keys
      if (savedElements) {
        localStorage.setItem(
          `drawink-board-${defaultBoard.id}-elements`,
          savedElements,
        );
      }
      if (savedState) {
        localStorage.setItem(
          `drawink-board-${defaultBoard.id}-state`,
          savedState,
        );
      }
    }
  } catch (error: any) {
    // Unable to access localStorage
    console.error(error);
  }

  let elements: DrawinkElement[] = [];
  if (savedElements) {
    try {
      elements = JSON.parse(savedElements);
    } catch (error: any) {
      console.error(error);
      // Do nothing because elements array is already empty
    }
  }

  let appState = null;
  if (savedState) {
    try {
      appState = {
        ...getDefaultAppState(),
        ...clearAppStateForLocalStorage(
          JSON.parse(savedState) as Partial<AppState>,
        ),
      };
    } catch (error: any) {
      console.error(error);
      // Do nothing because appState is already null
    }
  }
  return { elements, appState };
};

export const getElementsStorageSize = () => {
  try {
    const elements = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
    const elementsSize = elements?.length || 0;
    return elementsSize;
  } catch (error: any) {
    console.error(error);
    return 0;
  }
};

export const getTotalStorageSize = () => {
  try {
    const appState = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE);
    const collab = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_COLLAB);

    const appStateSize = appState?.length || 0;
    const collabSize = collab?.length || 0;

    return appStateSize + collabSize + getElementsStorageSize();
  } catch (error: any) {
    console.error(error);
    return 0;
  }
};
