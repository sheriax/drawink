import type { DrawinkElementSkeleton } from "@drawink/drawink/data/transform";

import { GraphConverter } from "../GraphConverter.js";

import {
  getText,
  computeDrawinkVertexStyle,
  computeDrawinkVertexLabelStyle,
  computeDrawinkArrowType,
} from "../helpers.js";
import { VERTEX_TYPE } from "../../interfaces.js";

import type { Flowchart } from "../../parser/flowchart.js";

const computeGroupIds = (
  graph: Flowchart,
): {
  getGroupIds: (elementId: string) => string[];
  getParentId: (elementId: string) => string | null;
} => {
  // Parse the diagram into a tree for rendering and grouping
  const tree: {
    [key: string]: {
      id: string;
      parent: string | null;
      isLeaf: boolean; // true = vertex, false = subGraph
    };
  } = {};
  graph.subGraphs.map((subGraph) => {
    subGraph.nodeIds.forEach((nodeId) => {
      tree[subGraph.id] = {
        id: subGraph.id,
        parent: null,
        isLeaf: false,
      };
      tree[nodeId] = {
        id: nodeId,
        parent: subGraph.id,
        isLeaf: graph.vertices[nodeId] !== undefined,
      };
    });
  });
  const mapper: {
    [key: string]: string[];
  } = {};
  [...Object.keys(graph.vertices), ...graph.subGraphs.map((c) => c.id)].forEach(
    (id) => {
      if (!tree[id]) {
        return;
      }
      let curr = tree[id];
      const groupIds: string[] = [];
      if (!curr.isLeaf) {
        groupIds.push(`subgraph_group_${curr.id}`);
      }

      while (true) {
        if (curr.parent) {
          groupIds.push(`subgraph_group_${curr.parent}`);
          curr = tree[curr.parent];
        } else {
          break;
        }
      }

      mapper[id] = groupIds;
    },
  );

  return {
    getGroupIds: (elementId) => {
      return mapper[elementId] || [];
    },
    getParentId: (elementId) => {
      return tree[elementId] ? tree[elementId].parent : null;
    },
  };
};

export const FlowchartToDrawinkSkeletonConverter = new GraphConverter({
  converter: (graph: Flowchart, options) => {
    const elements: DrawinkElementSkeleton[] = [];
    const fontSize = options.fontSize;
    const { getGroupIds, getParentId } = computeGroupIds(graph);

    // SubGraphs
    graph.subGraphs.reverse().forEach((subGraph) => {
      const groupIds = getGroupIds(subGraph.id);

      const containerElement: DrawinkElementSkeleton = {
        id: subGraph.id,
        type: "rectangle",
        groupIds,
        x: subGraph.x,
        y: subGraph.y,
        width: subGraph.width,
        height: subGraph.height,
        label: {
          groupIds,
          text: getText(subGraph),
          fontSize,
          verticalAlign: "top",
        },
      };

      elements.push(containerElement);
    });

    // Vertices
    Object.values(graph.vertices).forEach((vertex) => {
      if (!vertex) {
        return;
      }
      const groupIds = getGroupIds(vertex.id);

      // Compute custom style
      const containerStyle = computeDrawinkVertexStyle(vertex.containerStyle);
      const labelStyle = computeDrawinkVertexLabelStyle(vertex.labelStyle);

      let containerElement: DrawinkElementSkeleton = {
        id: vertex.id,
        type: "rectangle",
        groupIds,
        x: vertex.x,
        y: vertex.y,
        width: vertex.width,
        height: vertex.height,
        strokeWidth: 2,
        label: {
          groupIds,
          text: getText(vertex),
          fontSize,
          ...labelStyle,
        },
        link: vertex.link || null,
        ...containerStyle,
      };

      switch (vertex.type) {
        case VERTEX_TYPE.STADIUM: {
          containerElement = { ...containerElement, roundness: { type: 3 } };
          break;
        }
        case VERTEX_TYPE.ROUND: {
          containerElement = { ...containerElement, roundness: { type: 3 } };
          break;
        }
        case VERTEX_TYPE.DOUBLECIRCLE: {
          const CIRCLE_MARGIN = 5;
          // Create new groupId for double circle
          groupIds.push(`doublecircle_${vertex.id}}`);
          // Create inner circle element
          const innerCircle: DrawinkElementSkeleton = {
            type: "ellipse",
            groupIds,
            x: vertex.x + CIRCLE_MARGIN,
            y: vertex.y + CIRCLE_MARGIN,
            width: vertex.width - CIRCLE_MARGIN * 2,
            height: vertex.height - CIRCLE_MARGIN * 2,
            strokeWidth: 2,
            roundness: { type: 3 },
            label: {
              groupIds,
              text: getText(vertex),
              fontSize,
            },
          };
          containerElement = { ...containerElement, groupIds, type: "ellipse" };
          elements.push(innerCircle);
          break;
        }
        case VERTEX_TYPE.CIRCLE: {
          containerElement.type = "ellipse";
          break;
        }
        case VERTEX_TYPE.DIAMOND: {
          containerElement.type = "diamond";
          break;
        }
      }

      elements.push(containerElement);
    });

    // Edges
    graph.edges.forEach((edge) => {
      let groupIds: string[] = [];
      const startParentId = getParentId(edge.start);
      const endParentId = getParentId(edge.end);
      if (startParentId && startParentId === endParentId) {
        groupIds = getGroupIds(startParentId);
      }

      // Get arrow position data
      const { startX, startY, reflectionPoints } = edge;

      // Calculate Drawink arrow's points
      const points = reflectionPoints.map((point) => [
        point.x - reflectionPoints[0].x,
        point.y - reflectionPoints[0].y,
      ]);

      // Get supported arrow type
      const arrowType = computeDrawinkArrowType(edge.type);

      const arrowId = `${edge.start}_${edge.end}`;
      const containerElement: DrawinkElementSkeleton = {
        id: arrowId,
        type: "arrow",
        groupIds,
        x: startX,
        y: startY,
        // 4 and 2 are the Drawink's stroke width of thick and thin respectively
        // TODO: use constant exported from Drawink package
        strokeWidth: edge.stroke === "thick" ? 4 : 2,
        strokeStyle: edge.stroke === "dotted" ? "dashed" : undefined,
        points,
        ...(edge.text
          ? { label: { text: getText(edge), fontSize, groupIds } }
          : {}),
        roundness: {
          type: 2,
        },
        ...arrowType,
      };

      // Bind start and end vertex to arrow
      const startVertex = elements.find((e) => e.id === edge.start);
      const endVertex = elements.find((e) => e.id === edge.end);
      if (!startVertex || !endVertex) {
        return;
      }

      containerElement.start = {
        id: startVertex.id || "",
      };
      containerElement.end = {
        id: endVertex.id || "",
      };

      elements.push(containerElement);
    });

    return {
      elements,
    };
  },
});
