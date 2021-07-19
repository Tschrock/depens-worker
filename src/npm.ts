import npa, { ResultUnion, FileResult, HostedGitResult, URLResult, AliasResult, RegistryResult } from 'npm-package-arg';
import GitHost from 'hosted-git-info';

import { PackageVersionInfo } from './interfaces/api/DependencyVersionInfo';
import { PackageInfo } from './interfaces/PackageInfo';

// Fix npm-package-arg types.
declare module 'npm-package-arg' {
    type ResultUnion = FileResult | HostedGitResult | URLResult | AliasResult | RegistryResult;
    export default function (arg: string, where?: string): ResultUnion;
    interface HostedGit extends GitHost { } // eslint-disable-line @typescript-eslint/no-empty-interface
}

export class ChainableError extends Error {
    constructor(message?: string | undefined, public readonly causedBy?: Error | undefined) {
        super(message);
    }
}

export class UnsupportedPackageTypeError extends ChainableError { }
export class InvalidPackageSpecError extends ChainableError { }

/**
 * Gets information about a specific version of a package.
 * @param packageSpec The package identifier.
 */
export async function getPackageInfo(packageSpec: string): Promise<PackageInfo> {
    let result: ResultUnion;
    try {
        result = npa(packageSpec);
    }
    catch (err) {
        throw new InvalidPackageSpecError(`Invalid package argument: ${err.message}`, err);
    }

    switch (result.type) {
        case 'git': return getPackageInfoGit(result);
        case 'tag': throw new UnsupportedPackageTypeError('\'tag\' package types are not supported yet.');
        case 'version': throw new UnsupportedPackageTypeError('\'version\' package types are not supported yet.');
        case 'range': throw new UnsupportedPackageTypeError('\'range\' package types are not supported yet.');
        case 'remote': throw new UnsupportedPackageTypeError('\'remote\' package types are not supported yet.');
        case 'alias': throw new UnsupportedPackageTypeError('\'alias\' package types are not supported yet.');
        case 'file': throw new UnsupportedPackageTypeError(`'${packageSpec}' appears to be a local file. 'file' package types are not supported.`);
        case 'directory': throw new UnsupportedPackageTypeError(`'${packageSpec}' appears to be a local directory. 'directory' package types are not supported.`);
        default: throw new UnsupportedPackageTypeError(`Unknown package type '${(result as ResultUnion).type}'.`);
    }
}

// A hosted git repository or git url
// <protocol>://[<user>[:<password>]@]<hostname>[:<port>][:][/]<path>[#<commit-ish> | #semver:<semver>]
// Examples
//   npm install git+ssh://git@github.com:npm/cli.git#v1.0.27
//   npm install git+ssh://git@github.com:npm/cli#pull/273
//   npm install git+ssh://git@github.com:npm/cli#semver:^5.0
//   npm install git+https://isaacs@github.com/npm/cli.git
//   npm install git://github.com/npm/cli.git#v1.0.27
//   npm install mygithubuser/myproject
//   npm install github:mygithubuser/myproject
//   npm install gist:101a11beef
//   npm install bitbucket:mybitbucketuser/myproject
//   npm install gitlab:mygitlabuser/myproject
//   npm install gitlab:myusr/myproj#semver:^5.0
async function getPackageInfoGit(result: HostedGitResult | URLResult): Promise<PackageInfo> {
    // Get the package.json file
}

/**
 * Gets information about the available versions of a package.
 * @param packageSpec The package identifier.
 */
export async function getPackageVersionInfo(packageSpec: string): Promise<PackageVersionInfo> {
    const result = npa(packageSpec);

    // For registry packages, query the registry - for other packages, pull the package.json
}
