import { MIME_TYPES } from "@/lib/common";
import { Card } from "@/core/components/Card";
import { DrawinkLogo } from "@/core/components/DrawinkLogo";
import { encryptData, generateEncryptionKey } from "@/core/data/encryption";
import { serializeAsJSON } from "@/core/data/json";
import { useI18n } from "@/core/i18n";
import { isInitializedImageElement } from "@/lib/elements";
import { ref, uploadBytes } from "firebase/storage";
import { nanoid } from "nanoid";
import type React from "react";

import type { AppState, BinaryFileData, BinaryFiles } from "@/core/types";
import type { FileId, NonDeletedDrawinkElement } from "@/lib/elements/types";

import { FILE_UPLOAD_MAX_BYTES } from "../app_constants";
import { encodeFilesForUpload } from "../data/FileManager";
import { loadFirebaseStorage, saveFilesToFirebase } from "../data/firebase";

export const exportToDrawinkPlus = async (
  elements: readonly NonDeletedDrawinkElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  name: string,
) => {
  const storage = await loadFirebaseStorage();

  const id = `${nanoid(12)}`;

  const encryptionKey = (await generateEncryptionKey())!;
  const encryptedData = await encryptData(
    encryptionKey,
    serializeAsJSON(elements, appState, files, "database"),
  );

  const blob = new Blob([encryptedData.iv, new Uint8Array(encryptedData.encryptedBuffer)], {
    type: MIME_TYPES.binary,
  });

  const storageRef = ref(storage, `/migrations/scenes/${id}`);
  await uploadBytes(storageRef, blob, {
    customMetadata: {
      data: JSON.stringify({ version: 2, name }),
      created: Date.now().toString(),
    },
  });

  const filesMap = new Map<FileId, BinaryFileData>();
  for (const element of elements) {
    if (isInitializedImageElement(element) && files[element.fileId]) {
      filesMap.set(element.fileId, files[element.fileId]);
    }
  }

  if (filesMap.size) {
    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    await saveFilesToFirebase({
      prefix: `/migrations/files/scenes/${id}`,
      files: filesToUpload,
    });
  }

  window.open(`${import.meta.env.VITE_APP_PLUS_APP}/import?drawink=${id},${encryptionKey}`);
};

export const ExportToDrawinkPlus: React.FC<{
  elements: readonly NonDeletedDrawinkElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  name: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}> = ({ elements, appState, files, name, onError, onSuccess }) => {
  const { t } = useI18n();
  return (
    <Card color="primary">
      <div className="Card-icon">
        <DrawinkLogo
          style={{
            [`--color-logo-icon` as any]: "#fff",
            width: "2.8rem",
            height: "2.8rem",
          }}
        />
      </div>
      <h2>Drawink Pro</h2>
      <div className="Card-details">{t("exportDialog.drawinkplus_description")}</div>
      {/* <ToolButton
        className="Card-button"
        type="button"
        title={t("exportDialog.drawinkplus_button")}
        aria-label={t("exportDialog.drawinkplus_button")}
        showAriaLabel={true}
        onClick={async () => {
          try {
            trackEvent("export", "eplus", `ui (${getFrame()})`);
            await exportToDrawinkPlus(elements, appState, files, name);
            onSuccess();
          } catch (error: any) {
            console.error(error);
            if (error.name !== "AbortError") {
              onError(new Error(t("exportDialog.drawinkplus_exportError")));
            }
          }
        }}
      /> */}
    </Card>
  );
};
