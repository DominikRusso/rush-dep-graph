import { RushConfiguration } from '@microsoft/rush-lib'
import type { RushConfigurationProject } from '@microsoft/rush-lib'
import { IPackageJsonDependencyTable } from '@rushstack/node-core-library'

type RushProject = {
  dependencies: string[]
  dependents: string[]
}

export type DependencyGraph = { [projectName: string]: RushProject }

/**
 * Returns a rush project from the dependency graph or creates a new entry if it doesn't exist.
 * @param projectName name of the project to retrieve
 * @param dependencyGraph dependency graph to retrieve project from
 * @returns dependency graph entry
 */
function getDependencyGraphEntry(projectName: string, dependencyGraph: DependencyGraph): RushProject {
  if (dependencyGraph[projectName] === undefined) {
    dependencyGraph[projectName] = { dependencies: [], dependents: [] }
  }
  return dependencyGraph[projectName] as RushProject
}

/**
 * Checks if the dependency is a local rush project.
 */
function isRushProject(dependencyName: string, rushConfiguration: RushConfiguration): boolean {
  return rushConfiguration.projectsByName.has(dependencyName)
}

/**
 * Populates a dependency graph entry's `dependencies` property and those dependencies' `dependents`.
 * Both dependencies and dev dependencies are considered here, just like rush does internally.
 * Cyclic dependencies are ignored, since rush handles them differently internally.
 */
function populateEntryDependencies(thisProjectEntry: RushProject, project: RushConfigurationProject, dependencies: IPackageJsonDependencyTable, dependencyGraph: DependencyGraph, rushConfiguration: RushConfiguration): void {
  for (const dependencyName of Object.keys(dependencies)) {
    if (isRushProject(dependencyName, rushConfiguration)) {
      thisProjectEntry.dependencies.push(dependencyName)

      const dependencyEntry: RushProject = getDependencyGraphEntry(dependencyName, dependencyGraph)
      dependencyEntry.dependents.push(project.packageName)
    }
  }
}

/**
 * Returns the monorepo's dependency graph.
 * @param rushConfig The rush monorepo's configuration. If this parameter is not supplied it looks for a rush project by traversing up the directory tree starting from the current working directory.
 * @returns The dependency graph as an object.
 */
export function calculateDependencies(rushConfig: RushConfiguration = RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() })): DependencyGraph {
  const dependencyGraph: DependencyGraph = {}

  for (const project of rushConfig.projects) {
    const thisProjectEntry = getDependencyGraphEntry(project.packageName, dependencyGraph)

    populateEntryDependencies(thisProjectEntry, project, project.packageJson.dependencies ?? {}, dependencyGraph, rushConfig)
    populateEntryDependencies(thisProjectEntry, project, project.packageJson.devDependencies ?? {}, dependencyGraph, rushConfig)
  }

  return sortByDependencyCount(dependencyGraph)
}

/**
 * Returns a dependency graph sorted by
 * - the number of dependencies
 * - the number of dependents
 * - the project name.
 * @param dependencyGraph dependency graph to create sorted copy of
 * @returns sorted dependency graph
 */
function sortByDependencyCount(dependencyGraph: DependencyGraph): DependencyGraph {
  const counts: Array<{ name: string, project: RushProject }> = []
  for (const [projectName, rushProject] of Object.entries(dependencyGraph)) {
    counts.push({ name: projectName, project: rushProject })
  }
  counts.sort((a, b) => {
    let diff = a.project.dependencies.length - b.project.dependencies.length
    if (diff === 0) {
      diff = a.project.dependents.length - b.project.dependents.length
    }
    if (diff === 0) {
      diff = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    }
    return diff
  })
  const sortedDependencyGraph: DependencyGraph = {}
  for (const { name, project } of counts) {
    sortedDependencyGraph[name] = project
  }
  return sortedDependencyGraph
}
