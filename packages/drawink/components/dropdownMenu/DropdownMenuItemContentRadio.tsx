import { useEditorInterface } from "../App";
import { RadioGroup } from "../RadioGroup";

type Props<T> = {
  value: T;
  shortcut?: string;
  choices: {
    value: T;
    label: React.ReactNode;
    ariaLabel?: string;
  }[];
  onChange: (value: T) => void;
  children: React.ReactNode;
  name: string;
  disabled?: boolean;
};

const DropdownMenuItemContentRadio = <T,>({
  value,
  shortcut,
  onChange,
  choices,
  children,
  name,
  disabled,
}: Props<T>) => {
  const editorInterface = useEditorInterface();

  return (
    <>
      <div
        className="dropdown-menu-item-base dropdown-menu-item-bare"
        style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
      >
        <label className="dropdown-menu-item__text" htmlFor={name}>
          {children}
        </label>
        <RadioGroup
          name={name}
          value={value}
          onChange={onChange}
          choices={choices}
        />
      </div>
      {shortcut && editorInterface.formFactor !== "phone" && (
        <div className="dropdown-menu-item__shortcut dropdown-menu-item__shortcut--orphaned">
          {shortcut}
        </div>
      )}
    </>
  );
};

DropdownMenuItemContentRadio.displayName = "DropdownMenuItemContentRadio";

export default DropdownMenuItemContentRadio;
