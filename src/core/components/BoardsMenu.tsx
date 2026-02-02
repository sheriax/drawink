import type React from "react";
import { useEffect, useState } from "react";
import {
  boardsAPIAtom,
  boardsAtom,
  createBoardAtom,
  currentBoardIdAtom,
  deleteBoardAtom,
  editingBoardIdAtom,
  isLoadingBoardsAtom,
  refreshBoardsAtom,
  switchBoardAtom,
  updateBoardNameAtom,
} from "../atoms/boards";
import { useAtom, useAtomValue, useSetAtom } from "../editor-jotai";
import { t } from "../i18n";
import { FreedrawIcon, PlusIcon, TrashIcon, checkIcon } from "./icons";
import "./BoardsMenu.scss";
import Spinner from "./Spinner";

export const BoardsMenu = () => {
  const boards = useAtomValue(boardsAtom);
  const currentBoardId = useAtomValue(currentBoardIdAtom);
  const isLoading = useAtomValue(isLoadingBoardsAtom);
  const boardsAPI = useAtomValue(boardsAPIAtom);

  const [editingBoardId, setEditingBoardId] = useAtom(editingBoardIdAtom);
  const [newBoardName, setNewBoardName] = useState("");

  const refreshBoards = useSetAtom(refreshBoardsAtom);
  const createBoard = useSetAtom(createBoardAtom);
  const switchBoard = useSetAtom(switchBoardAtom);
  const updateBoardName = useSetAtom(updateBoardNameAtom);
  const deleteBoard = useSetAtom(deleteBoardAtom);

  useEffect(() => {
    refreshBoards();
  }, [refreshBoards]);

  const handleCreateBoard = async () => {
    const name = `Untitled Board ${boards.length + 1}`;
    await createBoard(name);
  };

  const handleSwitchBoard = async (id: string) => {
    if (id === currentBoardId) {
      return;
    }
    await switchBoard(id);
    refreshBoards();
  };

  const handleDeleteBoard = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t("alerts.deleteBoard"))) {
      await deleteBoard(id);
    }
  };

  const startEditing = (e: React.MouseEvent, board: { id: string; name: string }) => {
    e.stopPropagation();
    setEditingBoardId(board.id);
    setNewBoardName(board.name);
  };

  const saveBoardName = async (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    await updateBoardName({ id, name: newBoardName });
  };

  if (!boardsAPI) {
    return <div className="boards-menu-error">Boards API not available</div>;
  }

  if (isLoading && boards.length === 0) {
    return (
      <div className="boards-menu-loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="boards-menu">
      <div className="boards-menu-header">
        <button className="boards-menu-create-btn" onClick={handleCreateBoard}>
          {PlusIcon} {t("buttons.createBoard")}
        </button>
      </div>
      <ul className="boards-menu-list">
        {boards.map((board) => (
          <li
            key={board.id}
            className={`boards-menu-item ${board.id === currentBoardId ? "active" : ""}`}
            onClick={() => handleSwitchBoard(board.id)}
          >
            {editingBoardId === board.id ? (
              <div className="boards-menu-item-edit" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveBoardName(e, board.id);
                    }
                    if (e.key === "Escape") {
                      setEditingBoardId(null);
                    }
                  }}
                />
                <button onClick={(e) => saveBoardName(e, board.id)}>{checkIcon}</button>
              </div>
            ) : (
              <>
                <span className="boards-menu-item-name">{board.name}</span>
                <div className="boards-menu-item-actions">
                  <button onClick={(e) => startEditing(e, board)}>{FreedrawIcon}</button>
                  {boards.length > 1 && (
                    <button className="delete-btn" onClick={(e) => handleDeleteBoard(e, board.id)}>
                      {TrashIcon}
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
