import "./DrawinkLogo.scss";

// Import logo images
import logoBlackBg from "./assets/logo/drawink-logo-black-bg.png";
import logoTextBlackBg from "./assets/logo/drawink-logo-text-black-bg.png";
import logoTextWhiteBg from "./assets/logo/drawink-logo-text-white-bg.png";
import logoWhiteBg from "./assets/logo/drawink-logo-white-bg.png";

const LogoIcon = () => (
  <span className="DrawinkLogo-icon">
    {/* Light theme logo (dark logo on light background) */}
    <img
      src={logoWhiteBg}
      alt="Drawink Logo"
      className="DrawinkLogo-icon-img DrawinkLogo-icon-img--light"
    />
    {/* Dark theme logo (light logo on dark background) */}
    <img
      src={logoBlackBg}
      alt="Drawink Logo"
      className="DrawinkLogo-icon-img DrawinkLogo-icon-img--dark"
    />
  </span>
);

const LogoText = () => (
  <span className="DrawinkLogo-text">
    {/* Light theme text logo (dark text on light background) */}
    <img
      src={logoTextWhiteBg}
      alt="Drawink"
      className="DrawinkLogo-text-img DrawinkLogo-text-img--light"
    />
    {/* Dark theme text logo (light text on dark background) */}
    <img
      src={logoTextBlackBg}
      alt="Drawink"
      className="DrawinkLogo-text-img DrawinkLogo-text-img--dark"
    />
  </span>
);

type LogoSize = "xs" | "small" | "normal" | "large" | "custom" | "mobile";

interface LogoProps {
  size?: LogoSize;
  withText?: boolean;
  style?: React.CSSProperties;
  /**
   * If true, the logo will not be wrapped in a Link component.
   * The link prop will be ignored as well.
   * It will merely be a plain div.
   */
  isNotLink?: boolean;
}

export const DrawinkLogo = ({ style, size = "small", withText }: LogoProps) => {
  return (
    <div className={`DrawinkLogo is-${size}`} style={style}>
      <LogoIcon />
      {withText && <LogoText />}
    </div>
  );
};
