import { GraphConverter } from "../GraphConverter.js";
import { FileId } from "@drawink/drawink/element/types";
import { DrawinkElementSkeleton } from "@drawink/drawink/data/transform";
import { BinaryFiles } from "@drawink/drawink/types";
import { nanoid } from "nanoid";
import { GraphImage } from "../../interfaces.js";

export const GraphImageConverter = new GraphConverter<GraphImage>({
  converter: (graph) => {
    const imageId = nanoid() as FileId;

    const { width, height } = graph;
    const imageElement: DrawinkElementSkeleton = {
      type: "image",
      x: 0,
      y: 0,
      width,
      height,
      status: "saved",
      fileId: imageId,
    };
    const files = {
      [imageId]: {
        id: imageId,
        mimeType: graph.mimeType,
        dataURL: graph.dataURL,
      },
    } as BinaryFiles;
    return { files, elements: [imageElement] };
  },
});
