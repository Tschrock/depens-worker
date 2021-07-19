import { DependencyStatus } from './DependencyStatus';

export interface PackageVersionInfo {
    name: string;
    current: string;
    wanted: string;
    latest: string;
    stable: string;
    pinned: boolean;
    status: DependencyStatus;
    statusDetails: string;
}
