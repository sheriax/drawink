// import { loginIcon } from "@drawink/drawink/components/icons";
// import { POINTER_EVENTS } from "@drawink/common";
import { useI18n } from "@drawink/drawink/i18n";
import { WelcomeScreen } from "@drawink/drawink/index";
import React from "react";

import { isDrawinkPlusSignedUser } from "../app_constants";

export const AppWelcomeScreen: React.FC<{
  onCollabDialogOpen: () => any;
  isCollabEnabled: boolean;
}> = React.memo((props) => {
  const { t } = useI18n();
  let headingContent;

  if (isDrawinkPlusSignedUser) {
    // headingContent = t("welcomeScreen.app.center_heading_plus")
    //   .split(/(Drawink\+)/)
    //   .map((bit, idx) => {
    //     if (bit === "Drawink+") {
    //       return (
    //         <a
    //           style={{ pointerEvents: POINTER_EVENTS.inheritFromUI }}
    //           href={`${
    //             import.meta.env.VITE_APP_PLUS_APP
    //           }?utm_source=excalidraw&utm_medium=app&utm_content=welcomeScreenSignedInUser`}
    //           key={idx}
    //         >
    //           Drawink+
    //         </a>
    //       );
    //     }
    //     return bit;
    //   });
    headingContent = t("welcomeScreen.app.center_heading");
  } else {
    headingContent = t("welcomeScreen.app.center_heading");
  }

  return (
    <WelcomeScreen>
      <WelcomeScreen.Hints.MenuHint>
        {t("welcomeScreen.app.menuHint")}
      </WelcomeScreen.Hints.MenuHint>
      <WelcomeScreen.Hints.ToolbarHint />
      <WelcomeScreen.Hints.HelpHint />
      <WelcomeScreen.Center>
        <WelcomeScreen.Center.Logo />
        <WelcomeScreen.Center.Heading>
          {headingContent}
        </WelcomeScreen.Center.Heading>
        <WelcomeScreen.Center.Menu>
          <WelcomeScreen.Center.MenuItemLoadScene />
          <WelcomeScreen.Center.MenuItemHelp />
          {props.isCollabEnabled && (
            <WelcomeScreen.Center.MenuItemLiveCollaborationTrigger
              onSelect={() => props.onCollabDialogOpen()}
            />
          )}
          {/* {!isDrawinkPlusSignedUser && (
            <WelcomeScreen.Center.MenuItemLink
              href={`${
                import.meta.env.VITE_APP_PLUS_LP
              }/plus?utm_source=excalidraw&utm_medium=app&utm_content=welcomeScreenGuest`}
              shortcut={null}
              icon={loginIcon}
            >
              Sign up
            </WelcomeScreen.Center.MenuItemLink>
          )} */}
        </WelcomeScreen.Center.Menu>
      </WelcomeScreen.Center>
    </WelcomeScreen>
  );
});
