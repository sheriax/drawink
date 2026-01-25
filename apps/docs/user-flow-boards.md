# User Flow: Boards Management in Drawink

This document describes the current user flow for how users interact with boards and how boards are managed in the Drawink application.

---

## 📋 Overview

**Boards** are a feature that allows users to organize their drawings into separate workspaces. Each board contains its own set of elements (drawings) and application state, enabling users to work on multiple projects within the same application.

---

## 🏗️ Architecture

### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `BoardsAPI` | `packages/drawink/types.ts` | Interface defining all board operations |
| `boards.ts` (atoms) | `packages/drawink/atoms/boards.ts` | **Jotai atoms** for board state management |
| `BoardsMenu` | `packages/drawink/components/BoardsMenu.tsx` | UI component for board management |
| `LocalData.boards` | `drawink-app/data/LocalData.ts` | Implementation of board persistence |
| `DefaultSidebar` | `packages/drawink/components/DefaultSidebar.tsx` | Sidebar containing the boards tab |

### State Management (Jotai Atoms)

The board state is managed using **Jotai atoms** for reactive, efficient state management:

```typescript
// Core State Atoms
boardsAPIAtom      // BoardsAPI | null - The API implementation
boardsAtom         // Board[] - List of all boards
currentBoardIdAtom // string | null - Active board ID
isLoadingBoardsAtom // boolean - Loading state
editingBoardIdAtom // string | null - Board being renamed

// Derived Atoms
currentBoardAtom   // Board | null - Computed from boardsAtom + currentBoardIdAtom

// Action Atoms (write-only)
refreshBoardsAtom  // Reload boards from API
createBoardAtom    // Create a new board
switchBoardAtom    // Switch to a different board
updateBoardNameAtom // Rename a board
deleteBoardAtom    // Delete a board
```

### Data Types

```typescript
// Board data structure
interface Board {
  id: string;           // Unique identifier for the board
  name: string;         // Display name of the board
  createdAt: number;    // Timestamp when board was created
  lastModified: number; // Timestamp of last modification
}

// BoardsAPI interface
interface BoardsAPI {
  getBoards: () => Promise<Board[]>;
  createBoard: (name: string) => Promise<string>;
  switchBoard: (id: string) => Promise<void>;
  updateBoardName: (id: string, name: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  getCurrentBoardId: () => Promise<string | null>;
}
```

---

## 🔄 User Flow Diagram

```mermaid
flowchart TB
    subgraph Initialization
        A[App Loads] --> B{Boards exist?}
        B -->|No| C[Create Default Board]
        C --> D[Set as Current Board]
        B -->|Yes| E[Load Current Board ID]
        D --> F[Load Board Data]
        E --> F
    end

    subgraph Sidebar["Sidebar Interaction"]
        F --> G[User Opens Sidebar]
        G --> H[Boards Tab Selected]
        H --> I[Display Board List]
    end

    subgraph BoardActions["Board Actions"]
        I --> J{User Action}
        
        J -->|Create| K[Click '+' Button]
        K --> L[New Board Created]
        L --> M[Board List Refreshed]
        
        J -->|Switch| N[Click Board Item]
        N --> O[Save Current Board]
        O --> P[Load Selected Board]
        P --> Q[Page Reloads]
        
        J -->|Rename| R[Click Edit Icon]
        R --> S[Enter New Name]
        S --> T[Save Name]
        T --> M
        
        J -->|Delete| U[Click Delete Icon]
        U --> V{Confirm?}
        V -->|Yes| W[Board Deleted]
        W --> M
        V -->|No| I
    end
```

---

## 📍 Entry Points

### 1. Sidebar Access

The boards feature is accessed through the **DefaultSidebar** component, which includes a "Boards" tab:

```tsx
// DefaultSidebar.tsx
<Sidebar.TabTrigger tab={BOARDS_SIDEBAR_TAB}>
  {RectangleIcon}
</Sidebar.TabTrigger>

<Sidebar.Tab tab={BOARDS_SIDEBAR_TAB}>
  <BoardsMenu />
</Sidebar.Tab>
```

The sidebar contains three main tabs:
1. **Search** - Canvas search functionality
2. **Boards** - Board management (default tab)
3. **Library** - Element library

---

## 🛠️ User Actions

### 1. Creating a New Board

**Flow:**
1. User opens the sidebar and navigates to the **Boards** tab
2. User clicks the **"+ Create Board"** button
3. A new board is created with an auto-generated name: `"Untitled Board {n}"`
4. The board list refreshes to show the new board

**Code Path:**
```
BoardsMenu.handleCreateBoard()
  → boardsAPI.createBoard(name)
    → LocalData.boards.createBoard(name)
      → localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, ...)
  → refreshBoards()
```

**Implementation:**
```typescript
// LocalData.ts
createBoard: async (name: string): Promise<string> => {
  const boards = await LocalData.boards.getBoards();
  const newBoard: Board = {
    id: randomId(),
    name,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };
  boards.push(newBoard);
  localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(boards));
  return newBoard.id;
}
```

---

### 2. Switching Between Boards

**Flow:**
1. User clicks on a board item in the boards list
2. The current board's data is automatically flushed (via `LocalData.flushSave()`)
3. The new board ID is set as the current board
4. A `drawink-board-switch` custom event is dispatched
5. App.tsx listens to this event and loads the new board's data
6. The scene is updated with `drawinkAPI.updateScene()` - **NO page reload!**

**Code Path:**
```
BoardsMenu.handleSwitchBoard(id)
  → switchBoardAtom (atoms/boards.ts)
    → boardsAPI.switchBoard(id)
      → localStorage.setItem(LOCAL_STORAGE_CURRENT_BOARD_ID, id)
    → window.dispatchEvent("drawink-board-switch", { boardId })
  
[App.tsx event listener]
  → LocalData.flushSave()
  → LocalData.boards.loadBoardData(boardId)
  → drawinkAPI.updateScene({ elements, appState })
  → Load images for new board
```

**Board Switching Implementation:**
```typescript
// App.tsx - handleBoardSwitch event listener
const handleBoardSwitch = (event: Event) => {
    const { boardId } = (event as CustomEvent).detail;
    
    // Flush current board's data
    LocalData.flushSave();
    
    // Load new board's data
    const { elements, appState } = LocalData.boards.loadBoardData(boardId);
    
    // Update scene without reload
    drawinkAPI.updateScene({
        elements: elements || [],
        appState: { ...appState, isLoading: false },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
};
```

**Data Isolation:**
Each board stores its data in separate localStorage keys:
- **Elements**: `drawink-board-{boardId}-elements`
- **State**: `drawink-board-{boardId}-state`

---

### 3. Renaming a Board

**Flow:**
1. User hovers over a board item to reveal action buttons
2. User clicks the **edit icon** (pencil)
3. An inline text input appears with the current board name
4. User types the new name and presses **Enter** or clicks the checkmark
5. User can press **Escape** to cancel

**Code Path:**
```
BoardsMenu.startEditing(board)
  → [User edits name in input field]
  → BoardsMenu.saveBoardName(id)
    → boardsAPI.updateBoardName(id, newName)
      → localStorage.setItem(...)
    → refreshBoards()
```

---

### 4. Deleting a Board

**Flow:**
1. User hovers over a board item to reveal action buttons
2. User clicks the **delete icon** (trash)
3. A confirmation dialog appears: `"Are you sure you want to delete this board?"`
4. If confirmed, the board is deleted from the list
5. The board list refreshes

**Constraints:**
- Users **cannot delete the last remaining board** (the delete button is hidden when `boards.length <= 1`)
- Deleted board data (elements/state) is **not automatically cleaned up** from localStorage

**Code Path:**
```
BoardsMenu.handleDeleteBoard(e, id)
  → window.confirm(t("alerts.deleteBoard"))
  → boardsAPI.deleteBoard(id)
    → localStorage.setItem(...)
  → refreshBoards()
```

---

## 💾 Data Persistence

### Storage Keys

| Key | Purpose |
|-----|---------|
| `drawink-boards` | Array of all board metadata |
| `drawink-current-board-id` | ID of the currently active board |
| `drawink-board-{id}-elements` | Elements for a specific board |
| `drawink-board-{id}-state` | App state for a specific board |
| `drawink` (legacy) | Default elements storage |
| `drawink-state` (legacy) | Default state storage |

### Auto-Save Behavior

The application automatically saves the current board's data:

```typescript
// LocalData.ts - saveDataStateToLocalStorage()
const currentBoardId = localStorage.getItem(LOCAL_STORAGE_CURRENT_BOARD_ID);
const elementsKey = currentBoardId
  ? `drawink-board-${currentBoardId}-elements`
  : STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS;
const stateKey = currentBoardId
  ? `drawink-board-${currentBoardId}-state`
  : STORAGE_KEYS.LOCAL_STORAGE_APP_STATE;
```

---

## 🔄 Migration & Initialization

When the app loads for the first time (or when no boards exist), a **default board** is automatically created:

```typescript
// localStorage.ts - importFromLocalStorage()
const boards = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS);
if (!boards || JSON.parse(boards).length === 0) {
  const defaultBoard = {
    id: "default",
    name: "Default Board",
    createdAt: Date.now(),
    lastModified: Date.now(),
  };
  localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify([defaultBoard]));
  localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_BOARD_ID, defaultBoard.id);
  
  // Migrate existing data to the default board
  if (savedElements) {
    localStorage.setItem(`drawink-board-${defaultBoard.id}-elements`, savedElements);
  }
  if (savedState) {
    localStorage.setItem(`drawink-board-${defaultBoard.id}-state`, savedState);
  }
}
```

---

## 🧩 Atom Integration (Jotai)

The board state is managed using **Jotai atoms** instead of React Context for better reactivity and cleaner architecture.

### Initialization (Host App)

The `BoardsAPI` implementation is initialized via Jotai store before the app renders:

```typescript
// drawink-app/App.tsx
import { boardsAPIAtom } from "@drawink/drawink/atoms/boards";
import { editorJotaiStore } from "@drawink/drawink/editor-jotai";

// Initialize boards API atom before render
editorJotaiStore.set(boardsAPIAtom, LocalData.boards);
```

### Component Usage

Components access board state via Jotai hooks:

```typescript
// packages/drawink/components/BoardsMenu.tsx
import { useAtom, useAtomValue, useSetAtom } from "../editor-jotai";
import {
    boardsAtom,
    currentBoardIdAtom,
    isLoadingBoardsAtom,
    refreshBoardsAtom,
    createBoardAtom,
    switchBoardAtom,
} from "../atoms/boards";

export const BoardsMenu = () => {
    // Read-only state
    const boards = useAtomValue(boardsAtom);
    const currentBoardId = useAtomValue(currentBoardIdAtom);
    const isLoading = useAtomValue(isLoadingBoardsAtom);
    
    // Actions (write-only)
    const refreshBoards = useSetAtom(refreshBoardsAtom);
    const createBoard = useSetAtom(createBoardAtom);
    const switchBoard = useSetAtom(switchBoardAtom);
    
    // ...
};
```

### Board Switching Event

When switching boards, a custom event is dispatched for the host app to handle:

```typescript
// atoms/boards.ts - switchBoardAtom
window.dispatchEvent(
    new CustomEvent("drawink-board-switch", {
        detail: { boardId },
    }),
);
```

---

## 🎨 UI Components

### BoardsMenu Component

The `BoardsMenu` component (`packages/drawink/components/BoardsMenu.tsx`) provides the full UI for board management:

**States:**
- `boards` - Array of all boards
- `currentBoardId` - ID of active board
- `loading` - Loading state
- `editingBoardId` - ID of board being renamed
- `newBoardName` - Temporary name during editing

**Features:**
- Loading spinner while fetching boards
- Create button with "+" icon
- Board list with active state highlighting
- Inline editing for board names
- Hover-reveal action buttons (edit, delete)

---

## ✅ Implemented Improvements

| Feature | Status | Description |
|---------|--------|-------------|
| **No-Reload Board Switch** | ✅ Implemented | Boards switch instantly via `drawinkAPI.updateScene()` |
| **Orphan Data Cleanup** | ✅ Implemented | Board data is deleted when board is removed |
| **Jotai Atoms** | ✅ Implemented | State managed via atoms instead of Context |

---

## ⚠️ Remaining Limitations

| Limitation | Impact | Priority |
|------------|--------|----------|
| **Cannot Delete Last Board** | UX constraint (intentional) | ⚪ N/A |

### Existing Capabilities (NOT Limitations)

The following features **already exist** in Drawink:

1. **✅ Board Export/Import (`.drawink` files)** - Save/open board content using:
   - **Save to file**: `Ctrl+S` or Menu → Save (saves **current board** to `.drawink` JSON file)
   - **Save As**: `Ctrl+Shift+S` or Menu → Export → Save to disk  
   - **Open file**: `Ctrl+O` or Menu → Open (loads `.drawink` file, **replaces current board content**)
   - Implementation: `saveAsJSON()`, `loadFromJSON()` in `packages/drawink/data/json.ts`
   - MIME type: `application/vnd.drawink+json`
2. **✅ Library Export/Import** - Save/load element libraries (`.drawinklib` files)
3. **✅ Image Export** - Export scene as PNG/SVG with optional embedded scene data
4. **✅ Sharing via Link** - Export current scene to backend and generate shareable links (`exportToBackend`)
5. **✅ Live Collaboration** - Start real-time collaboration sessions with room links (`ShareDialog`, `Collab`)
6. **✅ File Sharing** - Files are encrypted and uploaded to Firebase for sharing

---

## 🔧 Future Improvements

### ~~1. Eliminate Page Reload on Board Switch~~ ✅ COMPLETED

**Implementation:**
- Added `drawink-board-switch` custom event in `switchBoardAtom`
- Added event listener in `App.tsx` that handles scene updates
- Added `LocalData.boards.loadBoardData(boardId)` helper function

---

### ~~2. Clean Up Orphan Data on Board Delete~~ ✅ COMPLETED

**Implementation:**
```typescript
// LocalData.ts - deleteBoard()
deleteBoard: async (id: string): Promise<void> => {
    const boards = await LocalData.boards.getBoards();
    const newBoards = boards.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(newBoards));
    
    // Clean up orphan data
    localStorage.removeItem(`drawink-board-${id}-elements`);
    localStorage.removeItem(`drawink-board-${id}-state`);
},
```

---

### ~~3. Add Per-Board Export/Import~~ ✅ COMPLETED

**Use Case:** Users want to backup/share specific boards.

**Implementation:** The existing `.drawink` file export/import already handles this:
- **Export**: `Ctrl+S` or Menu → Save exports the **current board** to a `.drawink` file
- **Import**: `Ctrl+O` or Menu → Open loads a `.drawink` file into the **current board**

The implementation uses `saveAsJSON()` and `loadFromJSON()` in `packages/drawink/data/json.ts`.

---

## 📊 Implementation Priority Matrix

| Feature | Effort | Impact | Status |
|---------|--------|--------|--------|
| No-reload board switch | Medium | High | ✅ Done |
| Orphan data cleanup | Low | Medium | ✅ Done |
| Jotai atoms migration | Medium | High | ✅ Done |
| Board export/import (.drawink files) | N/A | N/A | ✅ Already Exists |

---

## 🔗 Integration with Existing Sharing Features

### Current Sharing Flow

The application already supports two sharing mechanisms:

1. **Shareable Links** (`exportToBackend`)
   - Uploads encrypted scene data to backend
   - Generates URL with format: `#json={id},{encryptionKey}`
   - Files uploaded to Firebase: `/files/shareLinks/{id}`

2. **Live Collaboration** (`Collab.tsx`)
   - Creates real-time room via WebSocket
   - Generates URL with format: `#room={roomId},{roomKey}`
   - Supports multiple simultaneous users

### Board + Sharing Integration Ideas

1. **Share Current Board**: Add a "Share Board" button in BoardsMenu that uses existing `exportToBackend`
2. **Import from Link**: Allow importing a shared link as a new board instead of replacing current scene
3. **Collaborative Boards**: Start collaboration session scoped to a specific board
