export type DiscoveryOptions = DumbServerDiscoveryOptions | SmartServerDiscoveryOptions;

export interface DumbServerDiscoveryOptions {
    protocolType: 'dumb';
}

export interface SmartServerDiscoveryOptions {
    protocolType: 'smart';
    protocolVersion?: 1 | 2;
    smartService?: 'git-upload-pack' | 'git-receive-pack';
}
