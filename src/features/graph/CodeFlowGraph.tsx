import { useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphDataDto, GraphEdgeDto, GraphNodeType } from '../../types/api'

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
  class: '#0369a1',
  interface: '#0284c7',
  method: '#0891b2',
  method_version: '#0e7490',
  package: '#4338ca',
}

function projectFunctionCalls(graph: GraphDataDto): GraphDataDto {
  // The current API already projects flow graphs. Keep its endpoint and HTTP
  // edges so a frontend request can remain connected to the controller path.
  // NOTE: the backend renamed the API-endpoint edge type from "handled_by" to
  // "exposes" (see RepoMind-BE docs/qa_retrieval_part_plan.md "0-13"). Filtering
  // on the old "handled_by" name here silently dropped every exposes edge,
  // which disconnected API/endpoint nodes from flow graphs and made them show
  // up as floating nodes.
  if (graph.kind === 'flow') {
    const allowedTypes = new Set(['calls', 'http_calls', 'exposes'])
    const edges = graph.edges.filter((edge) => allowedTypes.has(edge.type))
    const connectedNodeIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]))
    return {
      kind: graph.kind,
      nodes: graph.nodes.filter((node) => connectedNodeIds.has(node.id)),
      edges,
    }
  }

  const ownerByVersionId = new Map(
    graph.edges
      .filter((edge) => edge.type === 'has_version')
      .map((edge) => [edge.target, edge.source]),
  )
  const versionIds = new Set(ownerByVersionId.keys())
  const visibleNodeIds = new Set(
    graph.nodes.filter((node) => !versionIds.has(node.id)).map((node) => node.id),
  )
  const seenCalls = new Set<string>()
  const edges: GraphEdgeDto[] = []

  for (const edge of graph.edges) {
    if (edge.type !== 'calls') continue

    const source = ownerByVersionId.get(edge.source) ?? edge.source
    const target = ownerByVersionId.get(edge.target) ?? edge.target
    const callId = `${source}:calls:${target}`
    if (source === target || !visibleNodeIds.has(source) || !visibleNodeIds.has(target) || seenCalls.has(callId)) {
      continue
    }
    seenCalls.add(callId)
    edges.push({ ...edge, id: callId, source, target, type: 'calls', label: 'CALLS' })
  }

  return {
    nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    edges,
  }
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
  const flowGraph = useMemo(() => projectFunctionCalls(graph), [graph])
  const positions = useMemo(() => getNodePositions(flowGraph), [flowGraph])

  const nodes = useMemo<Node[]>(
    () =>
      flowGraph.nodes.map((node) => ({
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
    [flowGraph.nodes, positions],
  )

  const edges = useMemo<Edge[]>(
    () =>
      flowGraph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? edge.type.toUpperCase(),
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 700 },
      })),
    [flowGraph.edges],
  )

  return (
    <div className="code-flow-graph" role="region" aria-label="코드 관계 그래프">
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
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
