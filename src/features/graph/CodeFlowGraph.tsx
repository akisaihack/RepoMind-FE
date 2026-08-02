import { useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphDataDto, GraphNodeType } from '../../types/api'

interface CodeFlowGraphProps {
  graph: GraphDataDto
}

const nodeColors: Record<GraphNodeType, string> = {
  project: '#7c3aed',
  module: '#4f46e5',
  file: '#2563eb',
  symbol: '#0891b2',
  api: '#059669',
  commit: '#d97706',
  document: '#be185d',
}

function getNodePositions(graph: GraphDataDto) {
  const depths = new Map<string, number>()
  const incomingTargets = new Set(graph.edges.map((edge) => edge.target))

  graph.nodes.forEach((node) => {
    if (!incomingTargets.has(node.id)) depths.set(node.id, 0)
  })

  for (let index = 0; index < graph.nodes.length; index += 1) {
    graph.edges.forEach((edge) => {
      const sourceDepth = depths.get(edge.source)
      if (sourceDepth === undefined) return
      depths.set(edge.target, Math.max(depths.get(edge.target) ?? 0, sourceDepth + 1))
    })
  }

  const rowsByDepth = new Map<number, number>()
  return new Map(
    graph.nodes.map((node, index) => {
      const depth = depths.get(node.id) ?? index
      const row = rowsByDepth.get(depth) ?? 0
      rowsByDepth.set(depth, row + 1)
      return [node.id, { x: depth * 260, y: row * 120 }]
    }),
  )
}

export function CodeFlowGraph({ graph }: CodeFlowGraphProps) {
  const positions = useMemo(() => getNodePositions(graph), [graph])

  const nodes = useMemo<Node[]>(
    () =>
      graph.nodes.map((node) => ({
        id: node.id,
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        data: {
          label: (
            <div className="flow-node">
              <span style={{ color: nodeColors[node.type] }}>{node.type}</span>
              <strong>{node.label}</strong>
              {node.detail && <small>{node.detail}</small>}
            </div>
          ),
        },
        style: {
          borderColor: nodeColors[node.type],
          borderRadius: 12,
          padding: 0,
          width: 210,
        },
      })),
    [graph.nodes, positions],
  )

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? edge.type.toUpperCase(),
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 700 },
      })),
    [graph.edges],
  )

  return (
    <div className="code-flow-graph" role="region" aria-label="코드 실행 흐름 그래프">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.35}
        maxZoom={1.6}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <MiniMap pannable zoomable nodeColor="#a5b4fc" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
