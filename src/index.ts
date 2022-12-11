import { calculateDependencies } from './dependencyGraph'
import type { DependencyGraph } from './dependencyGraph'

const dependencyGraph = calculateDependencies()

export function printRawDependencyGraph(dependencyGraph: DependencyGraph): void {
  console.log(JSON.stringify(dependencyGraph, undefined, 2))
}

printRawDependencyGraph(dependencyGraph)

// TODO cli
// TODO visualize: mermaid js or d3
