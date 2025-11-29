import { DrawinkConfig } from "../index.js";
import { DEFAULT_FONT_SIZE } from "../constants.js";
import { MermaidToDrawinkResult } from "../interfaces.js";
import { Flowchart } from "../parser/flowchart.js";
import { Sequence } from "../parser/sequence.js";

export class GraphConverter<T = Flowchart | Sequence> {
  private converter;
  constructor({
    converter,
  }: {
    converter: (
      graph: T,
      config: Required<DrawinkConfig>
    ) => MermaidToDrawinkResult;
  }) {
    this.converter = converter;
  }
  convert = (graph: T, config: DrawinkConfig) => {
    return this.converter(graph, {
      ...config,
      fontSize: config.fontSize || DEFAULT_FONT_SIZE,
    });
  };
}
