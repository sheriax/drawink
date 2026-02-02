/**
 * Convex Usage Examples
 *
 * This file demonstrates how to use Convex queries and mutations
 * in React components. Use these patterns when migrating from Firestore.
 */

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { uploadImage } from "../lib/firebaseStorage";

/**
 * Example 1: Query boards in a workspace (real-time)
 */
export function BoardsList({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  // useQuery automatically subscribes to real-time updates
  // When data changes in Convex, this component re-renders automatically
  const boards = useQuery(api.boards.listByWorkspace, { workspaceId });

  // boards is undefined while loading, null if error, or the data
  if (boards === undefined) {
    return <div>Loading boards...</div>;
  }

  if (boards === null) {
    return <div>Error loading boards</div>;
  }

  return (
    <div>
      <h2>Boards</h2>
      {boards.length === 0 ? (
        <p>No boards yet</p>
      ) : (
        <ul>
          {boards.map((board) => (
            <li key={board._id}>
              {board.name} - {board.isPublic ? "Public" : "Private"}
              {board.thumbnailUrl && <img src={board.thumbnailUrl} alt={board.name} width={50} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Example 2: Create a new board with mutation
 */
export function CreateBoardForm({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // useMutation returns a function you can call to trigger the mutation
  const createBoard = useMutation(api.boards.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Call the mutation - this will update the database
      // Any components using useQuery for boards will automatically re-render
      const boardId = await createBoard({
        name,
        workspaceId,
        isPublic,
      });

      console.log("Created board:", boardId);
      setName("");
      alert("Board created successfully!");
    } catch (error) {
      console.error("Failed to create board:", error);
      alert("Failed to create board");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Board</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Board name"
        required
      />
      <label>
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Public board
      </label>
      <button type="submit">Create Board</button>
    </form>
  );
}

/**
 * Example 3: Hybrid file upload (Firebase Storage + Convex metadata)
 */
export function FileUploadExample({ boardId }: { boardId: Id<"boards"> }) {
  const [uploading, setUploading] = useState(false);

  // Get the mutation to save file metadata
  const createFileMutation = useMutation(api.files.create);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Step 1: Upload file to Firebase Storage (cheap file storage)
      const fileId = crypto.randomUUID();
      const { url, path } = await uploadImage(file, { boardId, fileId });

      // Step 2: Save file metadata to Convex (database reference)
      await createFileMutation({
        boardId,
        fileId,
        firebaseStorageUrl: url,
        firebaseStoragePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      console.log("File uploaded successfully:", url);
      alert("File uploaded!");
    } catch (error) {
      console.error("File upload failed:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload File</h2>
      <input type="file" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}

/**
 * Example 4: Update board (optimistic updates)
 */
export function UpdateBoardName({
  boardId,
  currentName,
}: {
  boardId: Id<"boards">;
  currentName: string;
}) {
  const [name, setName] = useState(currentName);
  const updateBoard = useMutation(api.boards.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateBoard({
        boardId,
        name,
      });
      alert("Board updated!");
    } catch (error) {
      console.error("Update failed:", error);
      alert("Update failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Board name"
      />
      <button type="submit">Update</button>
    </form>
  );
}

/**
 * Example 5: Query current user (from Clerk auth)
 */
export function CurrentUserInfo() {
  // This queries the user synced from Clerk
  const currentUser = useQuery(api.users.getCurrent);

  if (currentUser === undefined) {
    return <div>Loading user...</div>;
  }

  if (!currentUser) {
    return <div>Not signed in</div>;
  }

  return (
    <div>
      <h2>Current User</h2>
      <p>Email: {currentUser.email}</p>
      <p>Name: {currentUser.name}</p>
      <p>Subscription: {currentUser.subscriptionTier}</p>
    </div>
  );
}

/**
 * Example 6: Query user's workspaces
 */
export function MyWorkspaces() {
  const workspaces = useQuery(api.workspaces.listMine);

  if (workspaces === undefined) {
    return <div>Loading workspaces...</div>;
  }

  return (
    <div>
      <h2>My Workspaces</h2>
      {workspaces.length === 0 ? (
        <p>No workspaces yet</p>
      ) : (
        <ul>
          {workspaces.map((workspace) => (
            <li key={workspace._id}>
              {workspace.name} - {workspace.type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Example 7: Delete board with confirmation
 */
export function DeleteBoardButton({ boardId }: { boardId: Id<"boards"> }) {
  const deleteBoard = useMutation(api.boards.softDelete);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this board?")) {
      return;
    }

    try {
      await deleteBoard({ boardId });
      alert("Board deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed");
    }
  };

  return (
    <button onClick={handleDelete} style={{ color: "red" }}>
      Delete Board
    </button>
  );
}

/**
 * MIGRATION NOTES:
 *
 * 1. Replace Firestore hooks with Convex hooks:
 *    - useDocument() → useQuery(api.collection.get)
 *    - useCollection() → useQuery(api.collection.list)
 *    - Custom hooks → useMutation(api.collection.mutation)
 *
 * 2. Real-time updates are automatic:
 *    - No need for onSnapshot listeners
 *    - useQuery automatically subscribes to changes
 *    - Components re-render when data changes
 *
 * 3. Transactions are built-in:
 *    - All mutations are ACID by default
 *    - No need for manual transaction handling
 *
 * 4. File uploads (hybrid pattern):
 *    - Upload file to Firebase Storage (keep existing uploadImage function)
 *    - Save metadata to Convex (new pattern)
 *    - Reference Firebase URL in Convex documents
 *
 * 5. Authentication:
 *    - Clerk user is automatically synced to Convex
 *    - Use api.users.getCurrent to get current user
 *    - User ID from Clerk becomes userId in Convex
 */
