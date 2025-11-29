import type mermaid from "mermaid";

export type Diagram = Awaited<
  ReturnType<typeof mermaid.mermaidAPI.getDiagramFromText>
>;

export interface DiagramStyleClassDef {
  styles?: string[];
  textStyles?: string[];
}

export interface ClassNode {
  id: string;
  domId: string;
  cssClasses?: string[];
  label?: string;
  methods?: string[];
  members?: string[];
  annotations?: string[];
}

export interface ClassNote {
  id: string;
  text: string;
  class?: string;
}

export interface ClassRelation {
  id1: string;
  id2: string;
  relation: {
    type1: number;
    type2: number;
    lineType: number;
  };
  title?: string;
  relationTitle1?: string;
  relationTitle2?: string;
}

export interface NamespaceNode {
  id: string;
  classes: string[];
}
