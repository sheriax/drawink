interface PickerModalProps {
  title: string;
  items: string[];
  type: "icon" | "color";
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const PickerModal: React.FC<PickerModalProps> = ({
  title,
  items,
  type,
  onSelect,
  onClose,
}) => {
  return (
    <div className="drawink-dashboard__picker-overlay" onClick={onClose}>
      <div className="drawink-dashboard__picker" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="drawink-dashboard__picker-grid">
          {items.map((item) =>
            type === "icon" ? (
              <button
                key={item}
                className="drawink-dashboard__picker-item"
                onClick={() => onSelect(item)}
              >
                {item}
              </button>
            ) : (
              <button
                key={item}
                className="drawink-dashboard__picker-item drawink-dashboard__picker-color"
                style={{ background: item }}
                onClick={() => onSelect(item)}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
};
