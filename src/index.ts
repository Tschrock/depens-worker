import { Router, Method, Params } from 'tiny-request-router';
import npa, { FileResult, HostedGitResult, URLResult, AliasResult, RegistryResult, Result } from 'npm-package-arg';
import GitHost from 'hosted-git-info';

import { res } from './response';
import { CloudflareCache } from './lib/cache/CloudflareCache';
import { MemoryCache } from './lib/cache/MemoryCache';
import { Package } from './interfaces/PackageInfo';

const memCache = new MemoryCache<string, unknown>(1000);
const cfCache = new CloudflareCache(new URL('https://example.com'));
const cacheKey = async (key: string) => new TextDecoder().decode(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(key)))

async function getPackageInfoGit(result: HostedGitResult | URLResult): Promise<Response> {
    // Check for the dependency info in the cache
    const spec = result.saveSpec || result.raw;
    const key = await cacheKey(spec);
    
    const memItem = await memCache.get<Package>(key);
    if (memItem) return res.ok.json(memItem);
    
    const cfItem = await cfCache.get<Package>(key);
    if (cfItem) {
        await memCache.set(key, cfItem);
        return res.ok.json(cfItem);
    }

    let gitUrl: URL | null = null;
    if (result.fetchSpec) {
        gitUrl = new URL(result.fetchSpec);
    } else if (result.hosted) {
        gitUrl = new URL(result.hosted.https());
    }

    if (!gitUrl) {
        return res.unprocessable.json({ message: `Couldn't determine the git URL for package '${result.raw}'.` });
    }

    gitUrl.protocol = 'https';

    result.hosted;

}

// Create the app
const app = new Router<(request: Request, params: Params) => Response | Promise<Response>>();

/**
 * Gets the status of a package's dependencies.
 * 
 * Process
 *  - Get the dependencies for the specified package.
 *  - Get the available versions for each dependency.
 *  - Calculate dependency statuses.
 * 
 * Needed abilities
 *  - For a given package spec (name + source + version), get the dependencies
 *    - can be cached indefinitely
 *  - For a given package spec (name + source), get all available versions
 *    - cache needs refreshed anytime a new version is added
 */
app.get('/api/v1/status/:id+', async (_, { id }) => {
    if (!id) return res.badRequest.text('Missing package id');
    let result: FileResult | HostedGitResult | URLResult | AliasResult | RegistryResult;
    try {
        result = npa(id);
    } catch (err) {
        return res.badRequest.json({ messasge: err.message });
    }
    // Get the dependency info
    switch (result.type) {
        case 'git': {
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

            // result.fetchSpec contains the URL to use to fetch the repo
            // result.gitRange contains the semver version to try looking up
            // result.gitCommittish contains the commitish to use

            return getPackageInfoGit(result);
        }
        case 'tag':
            return res.badRequest.json({ messasge: '\'tag\' package types are not supported yet.' });
        case 'version':
            return res.badRequest.json({ messasge: '\'version\' package types are not supported yet.' });
        case 'range':
            return res.badRequest.json({ messasge: '\'range\' package types are not supported yet.' });
        case 'remote':
            return res.badRequest.json({ messasge: '\'remote\' package types are not supported yet.' });
        case 'alias':
            return res.badRequest.json({ messasge: '\'alias\' package types are not supported yet.' });
        case 'file':
            return res.badRequest.json({ messasge: `'${id}' appears to be a local file. 'file' package types are not supported.` });
        case 'directory':
            return res.badRequest.json({ messasge: `'${id}' appears to be a local directory. 'directory' package types are not supported.` });
        default:
            return res.badRequest.json({ messasge: `Unknown package type '${(result as Result).type}'.` });
    }
});

// Gets the homepage
app.get('/', () => res.ok.html('<p>Hello World!</p>'));

// Error handling
async function catchError(value: Response | Promise<Response>): Promise<Response> {
    try {
 return await value; 
} catch (err) {
        console.error(err);
        return res.error.json({ message: err.message })
    }
}

// Listen for requests
addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    const match = app.match(event.request.method as Method, requestUrl.pathname);
    if (match) {
        event.respondWith(catchError(match.handler(event.request, { ...Object.fromEntries(requestUrl.searchParams), ...match.params })));
    } else {
        event.respondWith(res.notFound.text('The resource you requested could not be found.'));
    }
});
