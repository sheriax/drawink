import * as RadixTabs from "@radix-ui/react-tabs";

export const TTDDialogTabTrigger = ({
  children,
  tab,
  onSelect,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  tab: string;
  onSelect?: React.ReactEventHandler<HTMLButtonElement> | undefined;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect">) => {
  return (
    <RadixTabs.Trigger value={tab} asChild onSelect={onSelect} disabled={disabled}>
      <button
        type="button"
        className="ttd-dialog-tab-trigger"
        disabled={disabled}
        {...rest}
      >
        {children}
      </button>
    </RadixTabs.Trigger>
  );
};
TTDDialogTabTrigger.displayName = "TTDDialogTabTrigger";
