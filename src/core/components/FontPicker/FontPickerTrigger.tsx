import * as Popover from "@radix-ui/react-popover";

import { MOBILE_ACTION_BUTTON_BG } from "@/lib/common";

import type { FontFamilyValues } from "@/lib/elements/types";

import { t } from "../../i18n";
import { ButtonIcon } from "../ButtonIcon";
import { TextIcon } from "../icons";

import { useDrawinkSetAppState } from "../App";

interface FontPickerTriggerProps {
  selectedFontFamily: FontFamilyValues | null;
  isOpened?: boolean;
  compactMode?: boolean;
}

export const FontPickerTrigger = ({
  selectedFontFamily,
  isOpened = false,
  compactMode = false,
}: FontPickerTriggerProps) => {
  const setAppState = useDrawinkSetAppState();

  const compactStyle = compactMode
    ? {
        ...MOBILE_ACTION_BUTTON_BG,
        width: "2rem",
        height: "2rem",
      }
    : {};

  return (
    <Popover.Trigger asChild>
      <div data-openpopup="fontFamily" className="properties-trigger">
        <ButtonIcon
          standalone
          icon={TextIcon}
          title={t("labels.showFonts")}
          className="properties-trigger"
          testId={"font-family-show-fonts"}
          active={isOpened}
          onClick={() => {
            setAppState((appState) => ({
              openPopup: appState.openPopup === "fontFamily" ? null : appState.openPopup,
            }));
          }}
          style={{
            border: "none",
            ...compactStyle,
          }}
        />
      </div>
    </Popover.Trigger>
  );
};
