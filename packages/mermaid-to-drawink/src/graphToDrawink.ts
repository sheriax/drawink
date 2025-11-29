import { DrawinkConfig } from "./index.js";
import { FlowchartToDrawinkSkeletonConverter } from "./converter/types/flowchart.js";
import { GraphImageConverter } from "./converter/types/graphImage.js";
import { GraphImage, MermaidToDrawinkResult } from "./interfaces.js";
import { SequenceToDrawinkSkeletonConvertor } from "./converter/types/sequence.js";
import { Sequence } from "./parser/sequence.js";
import { Flowchart } from "./parser/flowchart.js";
import { Class } from "./parser/class.js";
import { classToDrawinkSkeletonConvertor } from "./converter/types/class.js";

export const graphToDrawink = (
  graph: Flowchart | GraphImage | Sequence | Class,
  options: DrawinkConfig = {}
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
        `graphToDrawink: unknown graph type "${(graph as any).type
        }, only flowcharts are supported!"`
      );
    }
  }
};
