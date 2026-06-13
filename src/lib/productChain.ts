import { BrowserProvider, Contract } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

export const PRODUCT_CONTRACT_ADDRESS = "0xd40BFE032544408d86EFD235F023eb35519eD16D";

const SEPOLIA_CHAIN_ID = "0xaa36a7";

export const PRODUCT_CONTRACT_ABI = [
    {
        name: "registerProduct",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "qrCode", type: "string" },
            { name: "productName", type: "string" },
            { name: "originLocation", type: "string" },
            { name: "producerName", type: "string" },
            { name: "eventDate", type: "uint256" },
        ],
        outputs: [],
    },
    {
        name: "addEvent",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "qrCode", type: "string" },
            { name: "eventType", type: "uint8" },
            { name: "location", type: "string" },
            { name: "actor", type: "string" },
            { name: "notes", type: "string" },
            { name: "eventDate", type: "uint256" },
        ],
        outputs: [],
    },
    {
        name: "getProductInfo",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "qrCode", type: "string" }],
        outputs: [
            { name: "name", type: "string" },
            { name: "originLocation", type: "string" },
            { name: "producerName", type: "string" },
            { name: "registeredAt", type: "uint256" },
        ],
    },
    {
        name: "getFullHistory",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "qrCode", type: "string" }],
        outputs: [
            {
                name: "",
                type: "tuple[]",
                components: [
                    { name: "eventType", type: "uint8" },
                    { name: "location", type: "string" },
                    { name: "actor", type: "string" },
                    { name: "notes", type: "string" },
                    { name: "timestamp", type: "uint256" },
                    { name: "eventDate", type: "uint256" },
                ],
            },
        ],
    },
    {
        name: "isProductRegistered",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "qrCode", type: "string" }],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "getEventCount",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "qrCode", type: "string" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getTotalProducts",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getAllProducts",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "string[]" }],
    },
    {
        name: "authorizeActor",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "actor", type: "address" }],
        outputs: [],
    },
    {
        name: "authorizedActors",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "bool" }],
    },
] as const;

export type EventType = 0 | 1 | 2 | 3 | 4;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    0: "Produced",
    1: "Transported",
    2: "Stored",
    3: "Donated",
    4: "Sold",
};

export interface ProductEvent {
    eventType: EventType;
    location: string;
    actor: string;
    notes: string;
    timestamp: number;
    eventDate: number;
}

export interface ProductInfo {
    name: string;
    originLocation: string;
    producerName: string;
    registeredAt: number;
}

export interface RegisterProductResult {
    success: boolean;
    txHash?: string;
    etherscanUrl?: string;
    error?: string;
}

export interface AddEventResult {
    success: boolean;
    txHash?: string;
    etherscanUrl?: string;
    error?: string;
}

async function getSigner() {
    if (!window.ethereum) throw new Error("MetaMask not found.");
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
    return provider.getSigner();
}

async function getReadOnlyContract() {
    const provider = new BrowserProvider(window.ethereum);
    return new Contract(PRODUCT_CONTRACT_ADDRESS, PRODUCT_CONTRACT_ABI, provider);
}

export async function registerProductOnChain(
    qrCode: string,
    productName: string,
    originLocation: string,
    producerName: string,
    eventDate: number
): Promise<RegisterProductResult> {
    try {
        const signer = await getSigner();
        const contract = new Contract(PRODUCT_CONTRACT_ADDRESS, PRODUCT_CONTRACT_ABI, signer);
        const tx = await (contract as any).registerProduct(qrCode, productName, originLocation, producerName, eventDate);
        await tx.wait();
        return {
            success: true,
            txHash: tx.hash,
            etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
        };
    } catch (err: any) {
        if (err.code === 4001 || err.code === "ACTION_REJECTED") {
            return { success: false, error: "Transaction rejected in MetaMask." };
        }
        return { success: false, error: err.message || "Transaction failed." };
    }
}

export async function addEventOnChain(
    qrCode: string,
    eventType: EventType,
    location: string,
    actor: string,
    notes: string,
    eventDate: number
): Promise<AddEventResult> {
    try {
        const signer = await getSigner();
        const contract = new Contract(PRODUCT_CONTRACT_ADDRESS, PRODUCT_CONTRACT_ABI, signer);
        const tx = await (contract as any).addEvent(qrCode, eventType, location, actor, notes, eventDate);
        await tx.wait();
        return {
            success: true,
            txHash: tx.hash,
            etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
        };
    } catch (err: any) {
        if (err.code === 4001 || err.code === "ACTION_REJECTED") {
            return { success: false, error: "Transaction rejected in MetaMask." };
        }
        return { success: false, error: err.message || "Transaction failed." };
    }
}

export async function getProductInfoFromChain(qrCode: string): Promise<ProductInfo | null> {
    try {
        const contract = await getReadOnlyContract();
        const result = await (contract as any).getProductInfo(qrCode);
        return {
            name: result[0],
            originLocation: result[1],
            producerName: result[2],
            registeredAt: Number(result[3]),
        };
    } catch {
        return null;
    }
}

export async function getFullHistoryFromChain(qrCode: string): Promise<ProductEvent[]> {
    try {
        const contract = await getReadOnlyContract();
        const result = await (contract as any).getFullHistory(qrCode);
        return result.map((e: any) => ({
            eventType: Number(e.eventType) as EventType,
            location: e.location,
            actor: e.actor,
            notes: e.notes,
            timestamp: Number(e.timestamp),
            eventDate: Number(e.eventDate),
        }));
    } catch {
        return [];
    }
}

export async function isProductRegisteredOnChain(qrCode: string): Promise<boolean> {
    try {
        const contract = await getReadOnlyContract();
        return await (contract as any).isProductRegistered(qrCode);
    } catch {
        return false;
    }
}

export async function getAllProductsFromChain(): Promise<string[]> {
    try {
        const contract = await getReadOnlyContract();
        return await (contract as any).getAllProducts();
    } catch {
        return [];
    }
}