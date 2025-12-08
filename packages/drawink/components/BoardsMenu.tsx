import React, { useEffect, useState, useCallback } from "react";
import { useBoards } from "../context/boards";
import { t } from "../i18n";
import { TrashIcon, FreedrawIcon, checkIcon, PlusIcon } from "./icons";
import "./BoardsMenu.scss";
import Spinner from "./Spinner";

export const BoardsMenu = () => {
    const boardsAPI = useBoards();
    const [boards, setBoards] = useState<
        { id: string; name: string; createdAt: number; lastModified: number }[]
    >([]);
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
    const [newBoardName, setNewBoardName] = useState("");

    const refreshBoards = useCallback(async () => {
        if (!boardsAPI) return;
        setLoading(true);
        try {
            const [allBoards, currentId] = await Promise.all([
                boardsAPI.getBoards(),
                boardsAPI.getCurrentBoardId(),
            ]);
            setBoards(allBoards);
            setCurrentBoardId(currentId);
        } catch (error) {
            console.error("Failed to load boards", error);
        } finally {
            setLoading(false);
        }
    }, [boardsAPI]);

    useEffect(() => {
        refreshBoards();
    }, [refreshBoards]);

    const handleCreateBoard = async () => {
        if (!boardsAPI) return;
        const name = `Untitled Board ${boards.length + 1}`;
        try {
            await boardsAPI.createBoard(name);
            await refreshBoards();
        } catch (error) {
            console.error("Failed to create board", error);
        }
    };

    const handleSwitchBoard = async (id: string) => {
        if (!boardsAPI || id === currentBoardId) return;
        try {
            await boardsAPI.switchBoard(id);
            setCurrentBoardId(id);
            // We might need to trigger a reload or state update here depending on how the app handles board switching
            window.location.reload();
        } catch (error) {
            console.error("Failed to switch board", error);
        }
    };

    const handleDeleteBoard = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!boardsAPI) return;
        if (window.confirm(t("alerts.deleteBoard"))) {
            try {
                await boardsAPI.deleteBoard(id);
                await refreshBoards();
            } catch (error) {
                console.error("Failed to delete board", error);
            }
        }
    };

    const startEditing = (e: React.MouseEvent, board: { id: string; name: string }) => {
        e.stopPropagation();
        setEditingBoardId(board.id);
        setNewBoardName(board.name);
    };

    const saveBoardName = async (e: React.MouseEvent | React.FormEvent, id: string) => {
        e.stopPropagation();
        if (!boardsAPI) return;
        try {
            await boardsAPI.updateBoardName(id, newBoardName);
            setEditingBoardId(null);
            await refreshBoards();
        } catch (error) {
            console.error("Failed to update board name", error);
        }
    };

    if (!boardsAPI) {
        return <div className="boards-menu-error">Boards API not available</div>;
    }

    if (loading && boards.length === 0) {
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
                        className={`boards-menu-item ${board.id === currentBoardId ? "active" : ""
                            }`}
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
                                        if (e.key === "Enter") saveBoardName(e, board.id);
                                        if (e.key === "Escape") setEditingBoardId(null);
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
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDeleteBoard(e, board.id)}
                                        >
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
