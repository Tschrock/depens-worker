export type DiscoveryResponse = DumbServerDiscoveryResponse | SmartServerDiscoveryResponse;

export interface DumbServerDiscoveryResponse {
    protocolType: 'dumb';
    refs: Map<string, string>;
}

export interface SmartServerDiscoveryResponse {
    protocolType: 'smart';
    protocolVersion: 1 | 2;
    refs: Map<string, string>;
    capabilities: Map<string, string | true>;
}
