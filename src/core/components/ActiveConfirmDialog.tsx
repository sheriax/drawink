import { actionClearCanvas } from "../actions";
import { atom, useAtom } from "../editor-jotai";
import { t } from "../i18n";

import { useDrawinkActionManager } from "./App";
import ConfirmDialog from "./ConfirmDialog";

const _activeConfirmDialogAtom = atom<"clearCanvas" | null>(null);
export const activeConfirmDialogAtom = atom(
  (get) => get(_activeConfirmDialogAtom),
  // @ts-ignore - jotai-scope type inference limitation
  (_get, set, value: "clearCanvas" | null) => set(_activeConfirmDialogAtom, value),
);

export const ActiveConfirmDialog = () => {
  const [activeConfirmDialog, setActiveConfirmDialog] = useAtom(activeConfirmDialogAtom);
  const actionManager = useDrawinkActionManager();

  if (!activeConfirmDialog) {
    return null;
  }

  if (activeConfirmDialog === "clearCanvas") {
    return (
      <ConfirmDialog
        onConfirm={() => {
          actionManager.executeAction(actionClearCanvas);
          setActiveConfirmDialog(null);
        }}
        onCancel={() => setActiveConfirmDialog(null)}
        title={t("clearCanvasDialog.title")}
      >
        <p className="clear-canvas__content"> {t("alerts.clearReset")}</p>
      </ConfirmDialog>
    );
  }

  return null;
};
