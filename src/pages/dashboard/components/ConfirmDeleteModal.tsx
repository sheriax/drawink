import { useState } from "react";

interface ConfirmDeleteModalProps {
  title: string;
  itemName: string;
  description: string;
  requireNameConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title,
  itemName,
  description,
  requireNameConfirm = false,
  onConfirm,
  onCancel,
}) => {
  const [confirmInput, setConfirmInput] = useState("");

  const canDelete = requireNameConfirm ? confirmInput === itemName : true;

  return (
    <div className="drawink-dashboard__modal-overlay" onClick={onCancel}>
      <div className="drawink-dashboard__modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>
          {description} <strong>{itemName}</strong>
          {requireNameConfirm
            ? ". This cannot be undone."
            : "? This cannot be undone."}
        </p>
        {requireNameConfirm && (
          <>
            <p>
              Type <strong>{itemName}</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={itemName}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && canDelete) onConfirm();
              }}
            />
          </>
        )}
        <div className="drawink-dashboard__modal-actions">
          <button className="drawink-dashboard__modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="drawink-dashboard__modal-delete"
            disabled={!canDelete}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
