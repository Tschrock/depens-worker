import { DependencyStatus } from './DependencyStatus';
import { PackageVersionInfo } from './DependencyVersionInfo';

export interface DependencyList {
    summary: DependencyStatus;
    packages: PackageVersionInfo[];
}
