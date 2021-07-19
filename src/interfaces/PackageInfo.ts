export interface PackageInfo {
    name: string;
    version: string;
    dependencies: Map<string, string>;
    devDependencies: Map<string, string>;
    peerDependencies: Map<string, string>;
    optionalDependencies: Map<string, string>;
    engines: Map<string, string>;
}
