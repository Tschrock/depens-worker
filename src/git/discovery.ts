import { PktLineSpecials } from '../lib/PktLineSpecials';
import { IterableSource } from '../lib/streams/IterableSource';
import { PeekableReader } from '../lib/streams/PeekableReader';
import { PktLineEncoder, PktLineInput } from '../lib/streams/PktLineEncoder';
import { PktLine, PktLineDecoder } from '../lib/streams/PktLineDecoder';
import { ensureEnd, makeSafeString, splitFirst, trimStart } from '../lib/util';
import { DiscoveryOptions } from './DiscoveryOptions';
import { DiscoveryResponse } from './DiscoveryResponse';

const asciiDecoder = new TextDecoder('ascii');

/**
 * Gets the URL to a subpath of a git repository.
 * @param repo The repo URL.
 * @param subpath The repo subpath.
 * @returns A new URL representing the path to the specified resource.
 */
function gitSubpath(repo: URL, subpath: string) {
    repo = new URL(repo.href);
    repo.pathname = ensureEnd(repo.pathname, '/');
    return new URL(trimStart(subpath, '/'), repo);
}

export async function discoverRefs(repo: URL, options?: DiscoveryOptions): Promise<DiscoveryResponse> {
    // We can use the same endpoint for smart and dumb servers, and gracefully pick between them depending on the response
    // Also, it appears that requesting an invalid version returns the unversioned (v1) response, so we can request v2 and gracefully fall back to v1 without needing to make a new request
    // > Dumb HTTP clients MUST make a GET request to `$GIT_URL/info/refs`, without any search/query parameters.
    // > HTTP clients that support the "smart" protocol (or both the "smart" and "dumb" protocols) MUST discover references by making a parameterized request for the `info/refs` file of the repository.
    // > The request MUST contain exactly one query parameter, service=$servicename, where $servicename MUST be the service name the client wishes to contact to complete the operation. The request MUST NOT contain additional query parameters.
    const refsUrl = gitSubpath(repo, '/info/refs');

    const optionsMerged = {
        protocol: 'smart',
        protocolVersion: 2,
        smartService: 'git-upload-pack',
        ...options,
    }

    const smartService = optionsMerged.protocol == 'smart' && optionsMerged.smartService;
    const protocolVersion = optionsMerged.protocol == 'smart' && optionsMerged.protocolVersion;

    // Set up search params
    if (smartService) {
        refsUrl.searchParams.append('service', smartService);
    }

    // Set up headers
    const headers = new Headers();
    if (protocolVersion) {
        headers.set('Git-Protocol', `version=${protocolVersion}`);
    }

    // Make the request
    const result = await fetch(refsUrl.href, { headers }); // TODO: switch to v2 afer it's implimented


    // Check the response status
    // > Clients MUST validate the status code is either 200 OK or 304 Not Modified.
    if (result.status !== 200) {
        throw new Error(result.statusText);
    }

    // Check the response's Content-Type to see if we got a smart server response
    // > The Content-Type MUST be `application/x-$servicename-advertisement`. Clients SHOULD fall back to the dumb protocol if another content type is returned.
    // > When falling back to the dumb protocol clients SHOULD NOT make an additional request to $GIT_URL/info/refs, but instead SHOULD use the response already in hand. 
    const isSmart = result.headers.get('Content-Type') === `application/x-${smartService}-advertisement`;

    if (isSmart) {
        if (smartService) {
            return discoverRefs_Smart(repo, smartService, result.body);
        } else {
            throw new Error('');
        }
    } else {
        return discoverRefs_Dumb(result);
    }

}

export async function discoverRefs_Smart(repo: URL, smartService: string, body: ReadableStream<Uint8Array> | null): Promise<DiscoveryResponse> {
    // Check the response body
    if (!body) {
        throw new Error('Smart Server sent an empty response.');
    }

    // Decode the packet lines
    const lines = new PeekableReader(body.pipeThrough(new PktLineDecoder()).getReader());

    // Get the first line
    let { done, value } = await lines.read();
    if (done || !(value instanceof Uint8Array)) {
        throw new Error('Smart Server sent an empty response."');
    }

    // > Clients MUST verify the first pkt-line is # service=$servicename.
    const firstLine = asciiDecoder.decode(value);
    if (firstLine != `# service=${smartService}`) {
        throw new Error(`Smart Server sent an unexpected first line. Expected "# service=git-upload-pack" but the server sent us "${makeSafeString(firstLine)}"`);
    }

    // Skip the flush line
    // The spec doesn't talk about this but servers seem to send it
    ({ done, value } = await lines.peek());
    while (!done && value === PktLineSpecials.FLUSH) {
        await lines.read();
        ({ done, value } = await lines.peek());
    }

    // Check for a version header (A version line is "version #" where # is an integer version number)
    let version = 1;
    if (!done && value instanceof Uint8Array) {
        const versionLine = asciiDecoder.decode(value);
        if (versionLine.startsWith('version')) {
            version = parseInt(versionLine.slice(8), 10);
            if (!Number.isSafeInteger(version)) {
                throw new Error(`Failed to parse Smart Server response version from line '${versionLine}'`);
            }

            // Consume the line
            ({ done, value } = await lines.read());
        }
    }

    // Handle the versioned response
    switch (version) {
        case 1: return discoverRefs_SmartV1(lines);
        case 2: return discoverRefs_SmartV2(repo, smartService, lines);
        default: throw new Error(`Unsupported Smart Server response version '${version}'`);
    }
}

export async function discoverRefs_Dumb(response: Response): Promise<DiscoveryResponse> {
    // Read as UTF-8 (*technically* it could be something else, but we won't worry about that for this)
    // > The Content-Type of the returned info/refs entity SHOULD be text/plain; charset=utf-8, but MAY be any content type. Clients MUST NOT attempt to validate the returned Content-Type.
    const data = await response.text();

    // Parse the list of refs
    // > The returned content is a UNIX formatted text file describing each ref and its known value.

    // The spec defines a "peeled_ref" in the format, but there's no documentation about what that actually is, so we're ignoring it for now
    //
    //   info_refs   =  *( ref_record )
    //   ref_record  =  any_ref / peeled_ref
    //   any_ref     =  obj-id HTAB refname LF
    //   peeled_ref  =  obj-id HTAB refname LF
    //    obj-id HTAB refname "^{}" LF
    //
    const refs = new Map<string, string>();
    for (const line of data.split('\n')) {
        const [id, name] = line.trim().split('\t');
        if (id && name) refs.set(name, id);
    }

    // Return the result
    return { protocolType: 'dumb', refs };
}

export async function discoverRefs_SmartV1(lines: PeekableReader<PktLine>): Promise<DiscoveryResponse> {
    let { done, value } = await lines.read();
    const refs = new Map<string, string>();
    const capabilities = new Map<string, string | true>();
    let readCaps = false;

    // Read through each line and parse it into a ref
    // > The returned response is a pkt-line stream describing each ref and its known value
    while (!done) {
        // Ignore special lines
        if (value instanceof Uint8Array) {
            // Decode the line
            const decoded = asciiDecoder.decode(value);

            // Split the id from the name and capabilities
            const [id, nameCaps] = splitFirst(decoded, ' ');
            if (id && nameCaps) {
                // If this is the first ref, handle capabilities
                // > The stream MUST include capability declarations behind a NUL on the first ref.
                if (!readCaps) {
                    readCaps = true;

                    // Split the name from the capabilities
                    const [name, capString] = splitFirst(nameCaps, '\0');
                    if (name) {
                        refs.set(name, id);
                    }

                    // Parse the capabilities
                    if (capString) {
                        const capList = capString.split(' ');
                        for (const cap of capList) {
                            const [capKey, capValue] = splitFirst(cap, '=');
                            capabilities.set(capKey, capValue || true);
                        }
                    }
                } else {
                    refs.set(nameCaps, id);
                }
            }
        }

        // Get the next line
        ({ done, value } = await lines.read());
    }

    return { protocolType: 'smart', protocolVersion: 1, refs, capabilities };
}

export async function discoverRefs_SmartV2(repo: URL, smartService: string, lines: PeekableReader<PktLine>): Promise<DiscoveryResponse> {
    // Read capabilities
    //
    //   capability-list = *capability
    //   capability = PKT-LINE(key[=value] LF)
    //   key = 1*(ALPHA | DIGIT | "-_")
    //   value = 1*(ALPHA | DIGIT | " -_.,?\/{}[]()<>!@#$%^&*+=:;")
    //
    let { done, value } = await lines.read();
    const capabilities = new Map<string, string | true>();
    while (!done) {
        // Ignore special lines
        if (value instanceof Uint8Array) {
            // Decode the line
            const decoded = asciiDecoder.decode(value);
            const [capKey, capValue] = decoded.split('=');
            if (capKey) {
                capabilities.set(capKey, capValue || true);
            }
        }
        // Next line
        ({ done, value } = await lines.read());
    }

    // Build the url
    const serviceUrl = gitSubpath(repo, smartService);

    // Build the headers
    const headers = new Headers();
    headers.set('Git-Protocol', 'version=2');

    // Build the body
    const refRequest: PktLineInput[] = [
        'command=ls-refs',
        PktLineSpecials.DELIMITER,
        PktLineSpecials.FLUSH,
    ];

    // Encode the body
    const body = new IterableSource(refRequest).pipeThrough(new PktLineEncoder());

    // Make the request
    const response = await fetch(serviceUrl.href, { headers, body });

    // Check the response body
    if (!response.body) {
        throw new Error('Smart Server sent an empty response.');
    }

    // Decode the packet lines
    const refLines = new PeekableReader(response.body.pipeThrough(new PktLineDecoder()).getReader());

    const refs = new Map<string, string>();
    ({ done, value } = await refLines.read());
    while (!done) {
        // Ignore special lines
        if (value instanceof Uint8Array) {
            // Decode the line
            const decoded = asciiDecoder.decode(value);

            // Split the id from the name and capabilities
            const [id, name] = splitFirst(decoded, ' ');
            if (id && name) refs.set(name, id);
        }

        // Get the next line
        ({ done, value } = await lines.read());
    }

    return { protocolType: 'smart', protocolVersion: 2, refs, capabilities };
}
