import { DEFAULT_EXPORT_PADDING, EDITOR_LS_KEYS } from "@excalidraw/common";

import type { MermaidConfig } from "@excalidraw/mermaid-to-excalidraw";
import type { MermaidToDrawinkResult } from "@excalidraw/mermaid-to-excalidraw/dist/interfaces";

import type { NonDeletedDrawinkElement } from "@excalidraw/element/types";

import { EditorLocalStorage } from "../../data/EditorLocalStorage";
import { canvasToBlob } from "../../data/blob";
import { t } from "../../i18n";
import { convertToDrawinkElements, exportToCanvas } from "../../index";

import type { AppClassProperties, BinaryFiles } from "../../types";

const resetPreview = ({
  canvasRef,
  setError,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  setError: (error: Error | null) => void;
}) => {
  const canvasNode = canvasRef.current;

  if (!canvasNode) {
    return;
  }
  const parent = canvasNode.parentElement;
  if (!parent) {
    return;
  }
  parent.style.background = "";
  setError(null);
  canvasNode.replaceChildren();
};

export interface MermaidToDrawinkLibProps {
  loaded: boolean;
  api: Promise<{
    parseMermaidToDrawink: (
      definition: string,
      config?: MermaidConfig,
    ) => Promise<MermaidToDrawinkResult>;
  }>;
}

interface ConvertMermaidToDrawinkFormatProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  mermaidToDrawinkLib: MermaidToDrawinkLibProps;
  mermaidDefinition: string;
  setError: (error: Error | null) => void;
  data: React.MutableRefObject<{
    elements: readonly NonDeletedDrawinkElement[];
    files: BinaryFiles | null;
  }>;
}

export const convertMermaidToDrawink = async ({
  canvasRef,
  mermaidToDrawinkLib,
  mermaidDefinition,
  setError,
  data,
}: ConvertMermaidToDrawinkFormatProps) => {
  const canvasNode = canvasRef.current;
  const parent = canvasNode?.parentElement;

  if (!canvasNode || !parent) {
    return;
  }

  if (!mermaidDefinition) {
    resetPreview({ canvasRef, setError });
    return;
  }

  try {
    const api = await mermaidToDrawinkLib.api;

    let ret;
    try {
      ret = await api.parseMermaidToDrawink(mermaidDefinition);
    } catch (err: any) {
      ret = await api.parseMermaidToDrawink(
        mermaidDefinition.replace(/"/g, "'"),
      );
    }
    const { elements, files } = ret;
    setError(null);

    data.current = {
      elements: convertToDrawinkElements(elements, {
        regenerateIds: true,
      }),
      files,
    };

    const canvas = await exportToCanvas({
      elements: data.current.elements,
      files: data.current.files,
      exportPadding: DEFAULT_EXPORT_PADDING,
      maxWidthOrHeight:
        Math.max(parent.offsetWidth, parent.offsetHeight) *
        window.devicePixelRatio,
    });
    // if converting to blob fails, there's some problem that will
    // likely prevent preview and export (e.g. canvas too big)
    try {
      await canvasToBlob(canvas);
    } catch (e: any) {
      if (e.name === "CANVAS_POSSIBLY_TOO_BIG") {
        throw new Error(t("canvasError.canvasTooBig"));
      }
      throw e;
    }
    parent.style.background = "var(--default-bg-color)";
    canvasNode.replaceChildren(canvas);
  } catch (err: any) {
    parent.style.background = "var(--default-bg-color)";
    if (mermaidDefinition) {
      setError(err);
    }

    throw err;
  }
};

export const saveMermaidDataToStorage = (mermaidDefinition: string) => {
  EditorLocalStorage.set(
    EDITOR_LS_KEYS.MERMAID_TO_EXCALIDRAW,
    mermaidDefinition,
  );
};

export const insertToEditor = ({
  app,
  data,
  text,
  shouldSaveMermaidDataToStorage,
}: {
  app: AppClassProperties;
  data: React.MutableRefObject<{
    elements: readonly NonDeletedDrawinkElement[];
    files: BinaryFiles | null;
  }>;
  text?: string;
  shouldSaveMermaidDataToStorage?: boolean;
}) => {
  const { elements: newElements, files } = data.current;

  if (!newElements.length) {
    return;
  }

  app.addElementsFromPasteOrLibrary({
    elements: newElements,
    files,
    position: "center",
    fitToContent: true,
  });
  app.setOpenDialog(null);

  if (shouldSaveMermaidDataToStorage && text) {
    saveMermaidDataToStorage(text);
  }
};
