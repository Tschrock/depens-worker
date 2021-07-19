const statuses = {
    ok: [200, 'OK'],
    notFound: [404, 'Not Found'],
    badRequest: [400, 'Bad Request'],
    unprocessable: [422, 'Unprocessable Entity'],
    error: [500, 'Internal Server Error'],
} as const;

const types = {
    json: ['application/json', (data: unknown) => JSON.stringify(data)],
    text: ['text/plain', (data: string) => data],
    html: ['text/html; charset=utf-8', (data: string) => data],
} as const;

const mods = {
    cache(...directiveArgs: Array<string | Record<string,string>>) {
        const directives = directiveArgs.reduce<string[]>((pv, cv) => {
            if(typeof cv === 'string') pv.push(cv);
            else pv.push(...Object.entries(cv).map(([k, v]) => k + '=' + v));
            return pv;
        }, []);
        return { headers: { 'Cache-Control': directives.join(',') } };
    },
} as const;

const buildResponse = (body?: BodyInit | null | undefined, init?: ResponseInit | undefined): Response => new Response(body, init);
const mergeInits = (a?: ResponseInit, b?: ResponseInit) => ({ ...a, ...b, headers: { ...a?.headers, ...b?.headers } });

type ResBuilder = (data: BodyInit, init?: ResponseInit) => Response
type MapStatuses = { [K in keyof typeof statuses]: ChainedResBuilder; }
type MapMods = { [K in keyof typeof mods]: (...args: Parameters<typeof mods[K]>) => ChainedResBuilder; }
type MapTypes = { [K in keyof typeof types]: (body: Parameters<(typeof types)[K][1]>[0], init?: ResponseInit | undefined) => Response; }
type ChainedResBuilder = ResBuilder & MapStatuses & MapTypes & MapMods;


function buildModFn<K extends keyof typeof mods>(builder: ResBuilder, modKey: K) {
    return (...args: Parameters<typeof mods[K]>) => chainify((body: BodyInit, init?: ResponseInit) => builder(body, mergeInits(mods[modKey].call(undefined, ...args), init)));
}

function chainify(builder: ResBuilder): ChainedResBuilder {
    return new Proxy(builder, {
        get(target, property: string, receiver) {
            if (property in statuses) {
                const [status, statusText] = statuses[property as keyof typeof statuses];
                return chainify((body: BodyInit, init?: ResponseInit) => builder(body, mergeInits({ status, statusText }, init)));
            }
            if (property in types) {
                const [mime, transform] = types[property as keyof typeof types];
                return (data: string, init?: ResponseInit) => builder(
                    transform(data),
                    mergeInits(init, { headers: { 'Content-Type': mime } })
                );
            }
            if (property in mods) {
                return buildModFn(builder, property as keyof typeof mods);
            }
            return Reflect.get(target, property, receiver);
        },
    }) as ChainedResBuilder;
}

export const res = chainify(buildResponse);
