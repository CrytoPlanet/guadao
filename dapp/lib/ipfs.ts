import { sha256, toBytes, toHex, fromHex } from 'viem';
import bs58 from 'bs58';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

// Fallback gateways if Pinata is unavailable
const FALLBACK_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
];

/**
 * Topic content schema for IPFS storage
 */
export interface TopicContent {
    version: number;
    title: string;
    description?: string;
    creator: string;
    timestamp: number;
    tags?: string[];
}

/**
 * Validate topic content against schema
 */
export function validateTopicContent(content: Partial<TopicContent>): content is TopicContent {
    if (!content.version || content.version !== 1) return false;
    if (!content.title || typeof content.title !== 'string' || content.title.length > 100) return false;
    if (!content.creator || !/^0x[a-fA-F0-9]{40}$/.test(content.creator)) return false;
    if (!content.timestamp || typeof content.timestamp !== 'number') return false;
    if (content.description && content.description.length > 2000) return false;
    return true;
}

/**
 * Upload JSON content to Pinata IPFS
 * @param content Topic content to upload
 * @returns IPFS CID string
 */
export async function uploadToIPFS(content: TopicContent): Promise<string> {
    if (!PINATA_JWT) {
        throw new Error('Pinata JWT not configured. Set NEXT_PUBLIC_PINATA_JWT environment variable.');
    }

    if (!validateTopicContent(content)) {
        throw new Error('Invalid topic content: missing required fields or invalid format');
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: JSON.stringify({
            pinataContent: content,
            pinataMetadata: {
                name: `gua-topic-${content.timestamp}`,
                keyvalues: {
                    creator: content.creator,
                    version: content.version.toString(),
                },
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinata upload failed: ${error}`);
    }

    const data = await response.json();
    return data.IpfsHash;
}

/**
 * Fetch content from IPFS with fallback gateways
 * @param cid IPFS CID
 * @returns Parsed topic content
 */
export async function fetchFromIPFS(cid: string): Promise<TopicContent> {
    const gateways = [PINATA_GATEWAY, ...FALLBACK_GATEWAYS];

    for (const gateway of gateways) {
        try {
            const url = `${gateway}${cid}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

            if (response.ok) {
                const content = await response.json();
                if (validateTopicContent(content)) {
                    return content;
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${gateway}:`, error);
            continue;
        }
    }

    throw new Error(`Failed to fetch CID ${cid} from all gateways`);
}

/**
 * Convert IPFS CIDv0 string to bytes32 hash (drop 0x1220 prefix)
 * @param cid IPFS CID string (starting with Qm)
 * @returns bytes32 hash string
 */
export function cidToBytes32(cid: string): `0x${string}` {
    const bytes = bs58.decode(cid);
    // CIDv0 is 34 bytes: 0x12 (function) 0x20 (length) [32 bytes hash]
    // We only want the 32 bytes hash
    if (bytes.length !== 34 || bytes[0] !== 0x12 || bytes[1] !== 0x20) {
        throw new Error('Invalid CIDv0 format');
    }
    return toHex(bytes.slice(2));
}

/**
 * Convert bytes32 hash to IPFS CIDv0 string
 * @param hash bytes32 hash string
 * @returns IPFS CID string
 */
export function bytes32ToCid(hash: `0x${string}`): string {
    const hashBytes = fromHex(hash, 'bytes');
    if (hashBytes.length !== 32) {
        throw new Error('Invalid hash length');
    }
    // Reconstruct CIDv0: 0x12 0x20 [32 bytes]
    const cidBytes = new Uint8Array(34);
    cidBytes[0] = 0x12;
    cidBytes[1] = 0x20;
    cidBytes.set(hashBytes, 2);
    return bs58.encode(cidBytes);
}

/**
 * Verify that a CID matches an on-chain hash
 * @param cid IPFS CID to verify
 * @param onChainHash The hash stored on-chain
 * @returns true if the CID's hash matches
 */
export function verifyCidHash(cid: string, onChainHash: `0x${string}`): boolean {
    try {
        return cidToBytes32(cid) === onChainHash;
    } catch {
        return false;
    }
}

/**
 * Upload multiple topics and return their CID hashes
 * @param topics Array of topic contents
 * @returns Array of [cid, hash] tuples
 */
export async function uploadTopics(
    topics: TopicContent[]
): Promise<Array<{ cid: string; hash: `0x${string}` }>> {
    const results = [];

    for (const topic of topics) {
        const cid = await uploadToIPFS(topic);
        const hash = cidToBytes32(cid);
        results.push({ cid, hash });
    }

    return results;
}

/**
 * Create a topic content object with default values
 */
export function createTopicContent(
    title: string,
    creator: string,
    description?: string,
    tags?: string[]
): TopicContent {
    return {
        version: 1,
        title,
        description,
        creator,
        timestamp: Math.floor(Date.now() / 1000),
        tags,
    };
}
