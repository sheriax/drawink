import React, { useContext } from "react";
import type { BoardsAPI } from "../types";

export const BoardsContext = React.createContext<BoardsAPI | undefined>(
    undefined,
);

export const useBoards = () => {
    const context = useContext(BoardsContext);
    return context;
};
