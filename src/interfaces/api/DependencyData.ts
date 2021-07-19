import { DependencyList } from './DependencyList';

export interface PackageDependencies {
    dependencies: DependencyList;
    devDependencies: DependencyList;
    peerDependencies: DependencyList;
    optionalDependencies: DependencyList;
}
