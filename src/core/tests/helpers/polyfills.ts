import { URL } from "node:url";

class ClipboardEvent extends Event {
  readonly clipboardData: DataTransfer;

  constructor(
    type: "paste" | "copy",
    eventInitDict: {
      clipboardData: DataTransfer;
    },
  ) {
    super(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    this.clipboardData = eventInitDict.clipboardData;
  }
}

type DataKind = "string" | "file";

class DataTransferItem {
  kind: DataKind;
  type: string;
  data: string | Blob;

  constructor(kind: DataKind, type: string, data: string | Blob) {
    this.kind = kind;
    this.type = type;
    this.data = data;
  }

  getAsString(callback: (data: string) => void): void {
    if (this.kind === "string") {
      callback(this.data as string);
    }
  }

  getAsFile(): File | null {
    if (this.kind === "file" && this.data instanceof File) {
      return this.data;
    }
    return null;
  }
}

class DataTransferItemList extends Array<DataTransferItem> {
  add(data: string | File, type = ""): void {
    if (typeof data === "string") {
      this.push(new DataTransferItem("string", type, data));
    } else if (data instanceof File) {
      this.push(new DataTransferItem("file", type, data));
    }
  }

  clear(): void {
    this.splice(0, this.length);
  }
}

class DataTransfer {
  public items: DataTransferItemList = new DataTransferItemList();

  get files() {
    return this.items.filter((item) => item.kind === "file").map((item) => item.getAsFile()!);
  }

  add(data: string | File, type = ""): void {
    if (typeof data === "string") {
      this.items.add(data, type);
    } else {
      this.items.add(data);
    }
  }

  setData(type: string, value: string) {
    this.items.add(value, type);
  }

  getData(type: string) {
    return this.items.find((item) => item.type === type)?.data || "";
  }
}

export const testPolyfills = {
  ClipboardEvent,
  DataTransfer,
  DataTransferItem,
  // https://github.com/vitest-dev/vitest/pull/4164#issuecomment-2172729965
  URL,
};
