import {
  APP_NAME,
  EVENT,
  THEME,
  VERSION_TIMEOUT,
  debounce,
  getFrame,
  getVersion,
  // isRunningInIframe,
  isDevEnv,
  isTestEnv,
  preventUnload,
  resolvablePromise,
} from "@drawink/common";
import {
  CaptureUpdateAction,
  Drawink,
  TTDDialogTrigger,
  reconcileElements,
  useEditorInterface,
} from "@drawink/drawink";
import { trackEvent } from "@drawink/drawink/analytics";
import { getDefaultAppState } from "@drawink/drawink/appState";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@drawink/drawink/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@drawink/drawink/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@drawink/drawink/components/OverwriteConfirm/OverwriteConfirm";
import { openConfirmModal } from "@drawink/drawink/components/OverwriteConfirm/OverwriteConfirmState";
import { ShareableLinkDialog } from "@drawink/drawink/components/ShareableLinkDialog";
import Trans from "@drawink/drawink/components/Trans";
import DropdownMenuItem from "@drawink/drawink/components/dropdownMenu/DropdownMenuItem";
import { loadFromBlob } from "@drawink/drawink/data/blob";
import { useCallbackRefState } from "@drawink/drawink/hooks/useCallbackRefState";
import { t } from "@drawink/drawink/i18n";
import polyfill from "@drawink/drawink/polyfill";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DiscordIcon,
  ExcalLogo,
  GithubIcon,
  XBrandIcon,
  exportToPlus,
  share,
  usersIcon,
  youtubeIcon,
} from "@drawink/drawink/components/icons";
import { parseLibraryTokensFromUrl, useHandleLibrary } from "@drawink/drawink/data/library";
import { restore, restoreAppState } from "@drawink/drawink/data/restore";
import { isElementLink } from "@drawink/element";
import { newElementWith } from "@drawink/element";
import { isInitializedImageElement } from "@drawink/element";
import clsx from "clsx";

import type { ResolutionType } from "@drawink/common/utility-types";
import type { ResolvablePromise } from "@drawink/common/utils";
import type { RemoteDrawinkElement } from "@drawink/drawink/data/reconcile";
import type { RestoredDataState } from "@drawink/drawink/data/restore";
import type {
  AppState,
  BinaryFiles,
  DrawinkImperativeAPI,
  DrawinkInitialDataState,
  UIAppState,
} from "@drawink/drawink/types";
import type {
  FileId,
  NonDeletedDrawinkElement,
  OrderedDrawinkElement,
} from "@drawink/element/types";

import CustomStats from "./CustomStats";
import {
  Provider,
  appJotaiStore,
  useAtom,
  useAtomValue,
  useAtomWithInitialValue,
} from "./app-jotai";
import {
  FIREBASE_STORAGE_PREFIXES,
  STORAGE_KEYS,
  SYNC_BROWSER_TABS_TIMEOUT,
  isDrawinkPlusSignedUser,
} from "./app_constants";
import Collab, { collabAPIAtom, isCollaboratingAtom, isOfflineAtom } from "./collab/Collab";
import { AppFooter } from "./components/AppFooter";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import { ExportToDrawinkPlus, exportToDrawinkPlus } from "./components/ExportToDrawinkPlus";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import { exportToBackend, getCollaborationLinkData, isCollaborationLink, loadScene } from "./data";

import { updateStaleImageStatuses } from "./data/FileManager";
import { importFromLocalStorage, importUsernameFromLocalStorage } from "./data/localStorage";

import { DrawinkPlusIframeExport } from "./DrawinkPlusIframeExport";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import CollabError, { collabErrorIndicatorAtom } from "./collab/CollabError";
import { AIComponents } from "./components/AI";
import { AuthDialog } from "./components/AuthDialog";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
  loadSavedDebugState,
} from "./components/DebugCanvas";
import { hybridStorageAdapter, localStorageQuotaExceededAtom } from "./data/HybridStorageAdapter";
import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
} from "./data/LocalStorageAdapter";
import { loadFilesFromFirebase } from "./data/firebase";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import { ShareDialog, shareDialogStateAtom } from "./share/ShareDialog";
import { useHandleAppTheme } from "./useHandleAppTheme";

import "./index.css"; // Tailwind CSS
import "./index.scss"; // Legacy SCSS (to be migrated)

import {
  type AuthUser,
  authStateAtom,
  cloudEnabledAtom,
  syncStatusAtom,
} from "@drawink/drawink/atoms/auth";
import { boardsAPIAtom } from "@drawink/drawink/atoms/boards";
import { editorJotaiStore } from "@drawink/drawink/editor-jotai";
import { AppSidebar } from "./components/AppSidebar";
import { DrawinkPlusPromoBanner } from "./components/DrawinkPlusPromoBanner";
import { useUser, useClerk } from "@clerk/clerk-react";

import type { CollabAPI } from "./collab/Collab";

polyfill();

// Initialize boards API atom with HybridStorageAdapter
editorJotaiStore.set(boardsAPIAtom, hybridStorageAdapter);

window.DRAWINK_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;

// Adding a listener outside of the component as it may (?) need to be
// subscribed early to catch the event.
//
// Also note that it will fire only if certain heuristics are met (user has
// used the app for some time, etc.)
window.addEventListener("beforeinstallprompt", (event: BeforeInstallPromptEvent) => {
  // prevent Chrome <= 67 from automatically showing the prompt
  event.preventDefault();
  // cache for later use
  pwaEvent = event;
});

let isSelfEmbedding = false;

if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const shareableLinkConfirmDialog = {
  title: t("overwriteConfirm.modal.shareableLink.title"),
  description: (
    <Trans
      i18nKey="overwriteConfirm.modal.shareableLink.description"
      bold={(text) => <strong>{text}</strong>}
      br={() => <br />}
    />
  ),
  actionLabel: t("overwriteConfirm.modal.shareableLink.button"),
  color: "danger",
} as const;

const initializeScene = async (opts: {
  collabAPI: CollabAPI | null;
  drawinkAPI: DrawinkImperativeAPI;
}): Promise<
  { scene: DrawinkInitialDataState | null } & (
    | { isExternalScene: true; id: string; key: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  const jsonBackendMatch = window.location.hash.match(/^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/);
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  const localDataState = importFromLocalStorage();

  let scene: RestoredDataState & {
    scrollToContent?: boolean;
  } = await loadScene(null, null, localDataState);

  let roomLinkData = getCollaborationLinkData(window.location.href);
  const isExternalScene = !!(id || jsonBackendMatch || roomLinkData);
  if (isExternalScene) {
    if (
      // don't prompt if scene is empty
      !scene.elements.length ||
      // don't prompt for collab scenes because we don't override local storage
      roomLinkData ||
      // otherwise, prompt whether user wants to override current scene
      (await openConfirmModal(shareableLinkConfirmDialog))
    ) {
      if (jsonBackendMatch) {
        scene = await loadScene(jsonBackendMatch[1], jsonBackendMatch[2], localDataState);
      }
      scene.scrollToContent = true;
      if (!roomLinkData) {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    } else {
      // https://github.com/drawink/drawink/issues/1919
      if (document.hidden) {
        return new Promise((resolve, reject) => {
          window.addEventListener(
            "focus",
            () => initializeScene(opts).then(resolve).catch(reject),
            {
              once: true,
            },
          );
        });
      }

      roomLinkData = null;
      window.history.replaceState({}, APP_NAME, window.location.origin);
    }
  } else if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);

    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      if (!scene.elements.length || (await openConfirmModal(shareableLinkConfirmDialog))) {
        return { scene: data, isExternalScene };
      }
    } catch (error: any) {
      return {
        scene: {
          appState: {
            errorMessage: t("alerts.invalidSceneUrl"),
          },
        },
        isExternalScene,
      };
    }
  }

  if (roomLinkData && opts.collabAPI) {
    const { drawinkAPI } = opts;

    const scene = await opts.collabAPI.startCollaboration(roomLinkData);

    return {
      // when collaborating, the state may have already been updated at this
      // point (we may have received updates from other clients), so reconcile
      // elements and appState with existing state
      scene: {
        ...scene,
        appState: {
          ...restoreAppState(
            {
              ...scene?.appState,
              theme: localDataState?.appState?.theme || scene?.appState?.theme,
            },
            drawinkAPI.getAppState(),
          ),
          // necessary if we're invoking from a hashchange handler which doesn't
          // go through App.initializeScene() that resets this flag
          isLoading: false,
        },
        elements: reconcileElements(
          scene?.elements || [],
          drawinkAPI.getSceneElementsIncludingDeleted() as RemoteDrawinkElement[],
          drawinkAPI.getAppState(),
        ),
      },
      isExternalScene: true,
      id: roomLinkData.roomId,
      key: roomLinkData.roomKey,
    };
  } else if (scene) {
    return isExternalScene && jsonBackendMatch
      ? {
          scene,
          isExternalScene,
          id: jsonBackendMatch[1],
          key: jsonBackendMatch[2],
        }
      : { scene, isExternalScene: false };
  }
  return { scene: null, isExternalScene: false };
};

const DrawinkWrapper = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const isCollabDisabled = false;

  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();

  const [langCode, setLangCode] = useAppLangCode();

  const editorInterface = useEditorInterface();

  // initial state
  // ---------------------------------------------------------------------------

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<DrawinkInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise = resolvablePromise<DrawinkInitialDataState | null>();
  }

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("load", "frame", getFrame());
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  const [drawinkAPI, drawinkRefCallback] = useCallbackRefState<DrawinkImperativeAPI>();

  const [, setShareDialogState] = useAtom(shareDialogStateAtom);
  const [collabAPI] = useAtom(collabAPIAtom);
  const [isCollaborating] = useAtomWithInitialValue(isCollaboratingAtom, () => {
    return isCollaborationLink(window.location.href);
  });
  const collabError = useAtomValue(collabErrorIndicatorAtom);

  useHandleLibrary({
    drawinkAPI,
    adapter: LibraryIndexedDBAdapter,
    // TODO maybe remove this in several months (shipped: 24-03-11)
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (isDevEnv()) {
      const debugState = loadSavedDebugState();

      if (debugState.enabled && !window.visualDebug) {
        window.visualDebug = {
          data: [],
        };
      } else {
        delete window.visualDebug;
      }
      forceRefresh((prev) => !prev);
    }
  }, [drawinkAPI]);

  // Clerk auth state
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { signOut } = useClerk();

  // Clerk auth state listener
  useEffect(() => {
    if (!isUserLoaded) {
      // Still loading auth state
      editorJotaiStore.set(authStateAtom, {
        isAuthenticated: false,
        user: null,
        isLoading: true,
        error: null,
      });
      return;
    }

    if (clerkUser) {
      // User is signed in
      const authUser: AuthUser = {
        uid: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || null,
        displayName: clerkUser.fullName || clerkUser.username || null,
        photoURL: clerkUser.imageUrl || null,
        providerId: clerkUser.externalAccounts[0]?.provider || "clerk",
        username: clerkUser.username || null,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
      };

      editorJotaiStore.set(authStateAtom, {
        isAuthenticated: true,
        user: authUser,
        isLoading: false,
        error: null,
      });

      // Enable cloud sync
      hybridStorageAdapter.enableCloudSync(clerkUser.id);
      editorJotaiStore.set(cloudEnabledAtom, true);

      // Wire up sync status updates
      hybridStorageAdapter.onSyncStatusChange((status) => {
        editorJotaiStore.set(syncStatusAtom, status);
      });

      console.log("[Auth] User signed in:", authUser.email);
    } else {
      // User is signed out
      editorJotaiStore.set(authStateAtom, {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });

      // Disable cloud sync
      hybridStorageAdapter.disableCloudSync();
      editorJotaiStore.set(cloudEnabledAtom, false);

      console.log("[Auth] User signed out");
    }
  }, [clerkUser, isUserLoaded]);

  useEffect(() => {
    if (!drawinkAPI || (!isCollabDisabled && !collabAPI)) {
      return;
    }

    const loadImages = (data: ResolutionType<typeof initializeScene>, isInitialLoad = false) => {
      if (!data.scene) {
        return;
      }
      if (collabAPI?.isCollaborating()) {
        if (data.scene.elements) {
          collabAPI
            .fetchImageFilesFromFirebase({
              elements: data.scene.elements,
              forceFetchFiles: true,
            })
            .then(({ loadedFiles, erroredFiles }) => {
              drawinkAPI.addFiles(loadedFiles);
              updateStaleImageStatuses({
                drawinkAPI,
                erroredFiles,
                elements: drawinkAPI.getSceneElementsIncludingDeleted(),
              });
            });
        }
      } else {
        const fileIds =
          data.scene.elements?.reduce((acc, element) => {
            if (isInitializedImageElement(element)) {
              return acc.concat(element.fileId);
            }
            return acc;
          }, [] as FileId[]) || [];

        if (data.isExternalScene) {
          loadFilesFromFirebase(
            `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
            data.key,
            fileIds,
          ).then(({ loadedFiles, erroredFiles }) => {
            drawinkAPI.addFiles(loadedFiles);
            updateStaleImageStatuses({
              drawinkAPI,
              erroredFiles,
              elements: drawinkAPI.getSceneElementsIncludingDeleted(),
            });
          });
        } else if (isInitialLoad) {
          if (fileIds.length) {
            hybridStorageAdapter.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  drawinkAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  drawinkAPI,
                  erroredFiles,
                  elements: drawinkAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
          // on fresh load, clear unused files from IDB (from previous
          // session)
          hybridStorageAdapter.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
        }
      }
    };

    initializeScene({ collabAPI, drawinkAPI }).then(async (data) => {
      loadImages(data, /* isInitialLoad */ true);
      initialStatePromiseRef.current.promise.resolve(data.scene);
    });

    const onHashChange = async (event: HashChangeEvent) => {
      event.preventDefault();
      const libraryUrlTokens = parseLibraryTokensFromUrl();
      if (!libraryUrlTokens) {
        if (collabAPI?.isCollaborating() && !isCollaborationLink(window.location.href)) {
          collabAPI.stopCollaboration(false);
        }
        drawinkAPI.updateScene({ appState: { isLoading: true } });

        initializeScene({ collabAPI, drawinkAPI }).then((data) => {
          loadImages(data);
          if (data.scene) {
            drawinkAPI.updateScene({
              ...data.scene,
              ...restore(data.scene, null, null, { repairBindings: true }),
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        });
      }
    };

    const syncData = debounce(() => {
      if (isTestEnv()) {
        return;
      }
      if (!document.hidden && ((collabAPI && !collabAPI.isCollaborating()) || isCollabDisabled)) {
        // don't sync if local state is newer or identical to browser state
        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
          const localDataState = importFromLocalStorage();
          const username = importUsernameFromLocalStorage();
          setLangCode(getPreferredLanguage());
          drawinkAPI.updateScene({
            ...localDataState,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
          LibraryIndexedDBAdapter.load().then((data) => {
            if (data) {
              drawinkAPI.updateLibrary({
                libraryItems: data.libraryItems,
              });
            }
          });
          collabAPI?.setUsername(username || "");
        }

        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
          const elements = drawinkAPI.getSceneElementsIncludingDeleted();
          const currFiles = drawinkAPI.getFiles();
          const fileIds =
            elements?.reduce((acc, element) => {
              if (
                isInitializedImageElement(element) &&
                // only load and update images that aren't already loaded
                !currFiles[element.fileId]
              ) {
                return acc.concat(element.fileId);
              }
              return acc;
            }, [] as FileId[]) || [];
          if (fileIds.length) {
            hybridStorageAdapter.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  drawinkAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  drawinkAPI,
                  erroredFiles,
                  elements: drawinkAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
        }
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    const onUnload = () => {
      hybridStorageAdapter.flushSave();
    };

    const visibilityChange = (event: FocusEvent | Event) => {
      if (event.type === EVENT.BLUR || document.hidden) {
        hybridStorageAdapter.flushSave();
      }
      if (event.type === EVENT.VISIBILITY_CHANGE || event.type === EVENT.FOCUS) {
        syncData();
      }
    };

    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onUnload, false);
    window.addEventListener(EVENT.BLUR, visibilityChange, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    window.addEventListener(EVENT.FOCUS, visibilityChange, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onUnload, false);
      window.removeEventListener(EVENT.BLUR, visibilityChange, false);
      window.removeEventListener(EVENT.FOCUS, visibilityChange, false);
      document.removeEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    };
  }, [isCollabDisabled, collabAPI, drawinkAPI, setLangCode]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      hybridStorageAdapter.flushSave();

      if (
        drawinkAPI &&
        hybridStorageAdapter.fileStorage.shouldPreventUnload(drawinkAPI.getSceneElements())
      ) {
        if (import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true") {
          preventUnload(event);
        } else {
          console.warn("preventing unload disabled (VITE_APP_DISABLE_PREVENT_UNLOAD)");
        }
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [drawinkAPI]);

  // Handle board switching without page reload
  useEffect(() => {
    if (!drawinkAPI) {
      return;
    }

    const handleBoardSwitch = (event: Event) => {
      const customEvent = event as CustomEvent<{ boardId: string }>;
      const { boardId } = customEvent.detail;

      // Flush current board's data before loading new one
      hybridStorageAdapter.flushSave();

      // Load new board's data
      const { elements, appState } = hybridStorageAdapter.loadBoardData(boardId);

      // Update scene with new board's data
      drawinkAPI.updateScene({
        elements: elements || [],
        appState: {
          ...appState,
          isLoading: false,
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });

      // Load images for the new board
      const fileIds = (elements || [])
        .filter((el: any) => el.type === "image" && el.fileId)
        .map((el: any) => el.fileId);

      if (fileIds.length > 0) {
        hybridStorageAdapter.fileStorage.getFiles(fileIds).then(({ loadedFiles, erroredFiles }) => {
          if (loadedFiles.length) {
            drawinkAPI.addFiles(loadedFiles);
          }
          updateStaleImageStatuses({
            drawinkAPI,
            erroredFiles,
            elements: drawinkAPI.getSceneElementsIncludingDeleted(),
          });
        });
      }
    };

    window.addEventListener("drawink-board-switch", handleBoardSwitch);
    return () => {
      window.removeEventListener("drawink-board-switch", handleBoardSwitch);
    };
  }, [drawinkAPI]);

  const onChange = (
    elements: readonly OrderedDrawinkElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (collabAPI?.isCollaborating()) {
      collabAPI.syncElements(elements);
    }

    // this check is redundant, but since this is a hot path, it's best
    // not to evaludate the nested expression every time
    if (!hybridStorageAdapter.isSavePaused()) {
      hybridStorageAdapter.save(elements, appState, files, () => {
        if (drawinkAPI) {
          let didChange = false;

          const elements = drawinkAPI.getSceneElementsIncludingDeleted().map((element) => {
            if (hybridStorageAdapter.fileStorage.shouldUpdateImageElementStatus(element)) {
              const newElement = newElementWith(element, { status: "saved" });
              if (newElement !== element) {
                didChange = true;
              }
              return newElement;
            }
            return element;
          });

          if (didChange) {
            drawinkAPI.updateScene({
              elements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    // Render the debug scene if the debug canvas is available
    if (debugCanvasRef.current && drawinkAPI) {
      debugRenderer(debugCanvasRef.current, appState, elements, window.devicePixelRatio);
    }
  };

  const [latestShareableLink, setLatestShareableLink] = useState<string | null>(null);

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedDrawinkElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    if (exportedElements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      const { url, errorMessage } = await exportToBackend(
        exportedElements,
        {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        },
        files,
      );

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (url) {
        setLatestShareableLink(url);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const { width, height } = appState;
        console.error(error, {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio,
        });
        throw new Error(error.message);
      }
    }
  };

  const renderCustomStats = (
    elements: readonly NonDeletedDrawinkElement[],
    appState: UIAppState,
  ) => {
    return (
      <CustomStats
        setToast={(message) => drawinkAPI!.setToast({ message })}
        appState={appState}
        elements={elements}
      />
    );
  };

  const isOffline = useAtomValue(isOfflineAtom);

  const localStorageQuotaExceeded = useAtomValue(localStorageQuotaExceededAtom);

  const onCollabDialogOpen = useCallback(
    () => setShareDialogState({ isOpen: true, type: "collaborationOnly" }),
    [setShareDialogState],
  );

  // browsers generally prevent infinite self-embedding, there are
  // cases where it still happens, and while we disallow self-embedding
  // by not whitelisting our own origin, this serves as an additional guard
  if (isSelfEmbedding) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
        }}
      >
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  const DrawinkPlusCommand = {
    label: "Drawink Pro",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: <div style={{ width: 14 }}>{ExcalLogo}</div>,
    keywords: ["plus", "cloud", "server"],
    perform: () => {
      window.open(
        `${
          import.meta.env.VITE_APP_PLUS_LP
        }/plus?utm_source=drawink&utm_medium=app&utm_content=command_palette`,
        "_blank",
      );
    },
  };
  const DrawinkPlusAppCommand = {
    label: "Sign up",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: <div style={{ width: 14 }}>{ExcalLogo}</div>,
    keywords: ["drawink", "plus", "cloud", "server", "signin", "login", "signup"],
    perform: () => {
      window.open(
        `${
          import.meta.env.VITE_APP_PLUS_APP
        }?utm_source=drawink&utm_medium=app&utm_content=command_palette`,
        "_blank",
      );
    },
  };

  return (
    <div
      style={{ height: "100%" }}
      className={clsx("drawink-app", {
        "is-collaborating": isCollaborating,
      })}
    >
      <Drawink
        drawinkAPI={drawinkRefCallback}
        onChange={onChange}
        initialData={initialStatePromiseRef.current.promise}
        isCollaborating={isCollaborating}
        onPointerUpdate={collabAPI?.onPointerUpdate}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {
              onExportToBackend,
              renderCustomUI: drawinkAPI
                ? (elements, appState, files) => {
                    return (
                      <ExportToDrawinkPlus
                        elements={elements}
                        appState={appState}
                        files={files}
                        name={drawinkAPI.getName()}
                        onError={(error) => {
                          drawinkAPI?.updateScene({
                            appState: {
                              errorMessage: error.message,
                            },
                          });
                        }}
                        onSuccess={() => {
                          drawinkAPI.updateScene({
                            appState: { openDialog: null },
                          });
                        }}
                      />
                    );
                  }
                : undefined,
            },
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        renderTopRightUI={(isMobile) => {
          return (
            <div className="drawink-ui-top-right">
              {drawinkAPI?.getEditorInterface().formFactor === "desktop" && (
                <DrawinkPlusPromoBanner isSignedIn={isDrawinkPlusSignedUser} />
              )}

              {collabError.message && <CollabError collabError={collabError} />}
              <DropdownMenuItem
                data-testid="share-button"
                className="share-button"
                onSelect={() => setShareDialogState({ isOpen: true, type: "share" })}
                icon={share}
              >
                {null}
              </DropdownMenuItem>
            </div>
          );
        }}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            drawinkAPI?.scrollToContent(element.link, { animate: true });
          }
        }}
      >
        <AppMainMenu
          onCollabDialogOpen={onCollabDialogOpen}
          isCollaborating={isCollaborating}
          isCollabEnabled={!isCollabDisabled}
          theme={appTheme}
          setTheme={(theme) => setAppTheme(theme)}
          refresh={() => forceRefresh((prev) => !prev)}
        />
        <AppWelcomeScreen
          onCollabDialogOpen={onCollabDialogOpen}
          isCollabEnabled={!isCollabDisabled}
        />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
          {drawinkAPI && (
            <OverwriteConfirmDialog.Action
              title={t("overwriteConfirm.action.drawinkPlus.title")}
              actionLabel={t("overwriteConfirm.action.drawinkPlus.button")}
              onClick={() => {
                exportToDrawinkPlus(
                  drawinkAPI.getSceneElements(),
                  drawinkAPI.getAppState(),
                  drawinkAPI.getFiles(),
                  drawinkAPI.getName(),
                );
              }}
            >
              {t("overwriteConfirm.action.drawinkPlus.description")}
            </OverwriteConfirmDialog.Action>
          )}
        </OverwriteConfirmDialog>
        <AppFooter onChange={() => drawinkAPI?.refresh()} />
        {drawinkAPI && <AIComponents drawinkAPI={drawinkAPI} />}

        <TTDDialogTrigger />
        {isCollaborating && isOffline && (
          <div className="alertalert--warning">{t("alerts.collabOfflineWarning")}</div>
        )}
        {localStorageQuotaExceeded && (
          <div className="alert alert--danger">{t("alerts.localStorageQuotaExceeded")}</div>
        )}
        {latestShareableLink && (
          <ShareableLinkDialog
            link={latestShareableLink}
            onCloseRequest={() => setLatestShareableLink(null)}
            setErrorMessage={setErrorMessage}
          />
        )}
        {drawinkAPI && !isCollabDisabled && <Collab drawinkAPI={drawinkAPI} />}

        <ShareDialog
          collabAPI={collabAPI}
          onExportToBackend={async () => {
            if (drawinkAPI) {
              try {
                await onExportToBackend(
                  drawinkAPI.getSceneElements(),
                  drawinkAPI.getAppState(),
                  drawinkAPI.getFiles(),
                );
              } catch (error: any) {
                setErrorMessage(error.message);
              }
            }
          }}
        />

        <AuthDialog />

        <AppSidebar />

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>{errorMessage}</ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: t("labels.liveCollaboration"),
              category: DEFAULT_CATEGORIES.app,
              keywords: ["team", "multiplayer", "share", "public", "session", "invite"],
              icon: usersIcon,
              perform: () => {
                setShareDialogState({
                  isOpen: true,
                  type: "collaborationOnly",
                });
              },
            },
            {
              label: t("roomDialog.button_stopSession"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!collabAPI?.isCollaborating(),
              keywords: ["stop", "session", "end", "leave", "close", "exit", "collaboration"],
              perform: () => {
                if (collabAPI) {
                  collabAPI.stopCollaboration();
                  if (!collabAPI.isCollaborating()) {
                    setShareDialogState({ isOpen: false });
                  }
                }
              },
            },
            {
              label: t("labels.share"),
              category: DEFAULT_CATEGORIES.app,
              predicate: true,
              icon: share,
              keywords: [
                "link",
                "shareable",
                "readonly",
                "export",
                "publish",
                "snapshot",
                "url",
                "collaborate",
                "invite",
              ],
              perform: async () => {
                setShareDialogState({ isOpen: true, type: "share" });
              },
            },
            {
              label: "GitHub",
              icon: GithubIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["issues", "bugs", "requests", "report", "features", "social", "community"],
              perform: () => {
                window.open("https://github.com/drawink/drawink", "_blank", "noopener noreferrer");
              },
            },
            {
              label: t("labels.followUs"),
              icon: XBrandIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["twitter", "contact", "social", "community"],
              perform: () => {
                window.open("https://x.com/drawink", "_blank", "noopener noreferrer");
              },
            },
            {
              label: t("labels.discordChat"),
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              icon: DiscordIcon,
              keywords: [
                "chat",
                "talk",
                "contact",
                "bugs",
                "requests",
                "report",
                "feedback",
                "suggestions",
                "social",
                "community",
              ],
              perform: () => {
                window.open("https://discord.gg/UexuTaE", "_blank", "noopener noreferrer");
              },
            },
            {
              label: "YouTube",
              icon: youtubeIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["features", "tutorials", "howto", "help", "community"],
              perform: () => {
                window.open("https://youtube.com/@drawink", "_blank", "noopener noreferrer");
              },
            },
            ...(isDrawinkPlusSignedUser
              ? [
                  {
                    ...DrawinkPlusAppCommand,
                    label: "Sign in / Go to Drawink Pro",
                  },
                ]
              : [DrawinkPlusCommand, DrawinkPlusAppCommand]),

            {
              label: t("overwriteConfirm.action.drawinkPlus.button"),
              category: DEFAULT_CATEGORIES.export,
              icon: exportToPlus,
              predicate: true,
              keywords: ["plus", "export", "save", "backup"],
              perform: () => {
                if (drawinkAPI) {
                  exportToDrawinkPlus(
                    drawinkAPI.getSceneElements(),
                    drawinkAPI.getAppState(),
                    drawinkAPI.getFiles(),
                    drawinkAPI.getName(),
                  );
                }
              },
            },
            {
              ...CommandPalette.defaultItems.toggleTheme,
              perform: () => {
                setAppTheme(editorTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK);
              },
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // event cannot be reused, but we'll hopefully
                    // grab new one as the event should be fired again
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
        />
        {isVisualDebuggerEnabled() && drawinkAPI && (
          <DebugCanvas
            appState={drawinkAPI.getAppState()}
            scale={window.devicePixelRatio}
            ref={debugCanvasRef}
          />
        )}
      </Drawink>
    </div>
  );
};

const DrawinkApp = () => {
  const isCloudExportWindow = window.location.pathname === "/drawink-plus-export";
  if (isCloudExportWindow) {
    return <DrawinkPlusIframeExport />;
  }

  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        <DrawinkWrapper />
      </Provider>
    </TopErrorBoundary>
  );
};

export default DrawinkApp;
