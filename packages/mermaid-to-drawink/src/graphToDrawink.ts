import { FlowchartToDrawinkSkeletonConverter } from "./converter/types/flowchart.js";
import { GraphImageConverter } from "./converter/types/graphImage.js";

import { SequenceToDrawinkSkeletonConvertor } from "./converter/types/sequence.js";

import { classToDrawinkSkeletonConvertor } from "./converter/types/class.js";

import type { GraphImage, MermaidToDrawinkResult } from "./interfaces.js";
import type { Sequence } from "./parser/sequence.js";
import type { Flowchart } from "./parser/flowchart.js";
import type { Class } from "./parser/class.js";

import type { DrawinkConfig } from "./index.js";

export const graphToDrawink = (
  graph: Flowchart | GraphImage | Sequence | Class,
  options: DrawinkConfig = {},
): MermaidToDrawinkResult => {
  switch (graph.type) {
    case "graphImage": {
      return GraphImageConverter.convert(graph, options);
    }

    case "flowchart": {
      return FlowchartToDrawinkSkeletonConverter.convert(graph, options);
    }

    case "sequence": {
      return SequenceToDrawinkSkeletonConvertor.convert(graph, options);
    }

    case "class": {
      return classToDrawinkSkeletonConvertor.convert(graph, options);
    }

    default: {
      throw new Error(
        `graphToDrawink: unknown graph type "${
          (graph as any).type
        }, only flowcharts are supported!"`,
      );
    }
  }
};
