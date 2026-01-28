import { Tooltip } from "@/core/components/Tooltip";
import { shield } from "@/core/components/icons";
import { useI18n } from "@/core/i18n";

export const EncryptedIcon = () => {
  const { t } = useI18n();

  return (
    <a
      className="encrypted-icon tooltip"
      href="https://plus.drawink.app/blog/end-to-end-encryption"
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t("encrypted.link")}
    >
      <Tooltip label={t("encrypted.tooltip")} long={true}>
        {shield}
      </Tooltip>
    </a>
  );
};
