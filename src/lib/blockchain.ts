/**
 * src/lib/blockchain.ts
 *
 * Web3 utility functions for MetaMask connection and
 * FoodDonation smart contract interaction on Sepolia testnet.
 */

import { BrowserProvider, Contract, JsonRpcProvider, isAddress } from "ethers";

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = "0xb4aF266E08659B6C18da330b7596fA8b92e42783";

// Sepolia Chain ID
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // = 11155111 decimal
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

// Public Sepolia RPC (for reading data without needing MetaMask)
const SEPOLIA_RPC_URL = "https://rpc.sepolia.org";

// ─── ABI (Application Binary Interface) ──────────────────────────────────────
export const CONTRACT_ABI = [
  {
    name: "recordDonation",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "donor", type: "address" },
      { name: "itemName", type: "string" },
      { name: "isCritical", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "getTokenBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "donor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getDonationCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "donor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTotalDonations",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "DonationRecorded",
    type: "event",
    inputs: [
      { name: "donor", type: "address", indexed: true },
      { name: "itemName", type: "string", indexed: false },
      { name: "tokensAwarded", type: "uint256", indexed: false },
      { name: "isCritical", type: "bool", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface DonationResult {
  success: boolean;
  txHash?: string;
  etherscanUrl?: string;
  tokensAwarded?: number;
  donorAddress?: string;
  error?: string;
}

export type WalletConnectionMethod = "metamask" | "manual";

export interface WalletConnection {
  method: WalletConnectionMethod;
  address: string;
  chainId?: number;
}

// ─── ENVIRONMENT DETECTION ───────────────────────────────────────────────────

/**
 * Checks if window.ethereum exists (MetaMask in browser or in-app browser)
 */
export function isMetaMaskAvailable(): boolean {
  return typeof window !== "undefined" && Boolean((window as any).ethereum);
}

/**
 * Checks if the device is a mobile phone/tablet
 */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

/**
 * Returns true if MetaMask is available for direct injection.
 */
export function canUseMetaMaskDirectly(): boolean {
  return isMetaMaskAvailable();
}

/**
 * Validates an Ethereum address string
 */
export function isValidEthAddress(address: string): boolean {
  return isAddress(address);
}

// ─── METAMASK DEEP LINK (For Mobile Devices) ─────────────────────────────────

/**
 * Generates a MetaMask deep link to open the current site inside MetaMask app
 */
export function getMetaMaskDeepLink(currentUrl?: string): string {
  const url = currentUrl || window.location.href;
  const cleanUrl = url.replace(/^https?:\/\//, "");
  return `https://metamask.app.link/dapp/${cleanUrl}`;
}

// ─── WALLET CONNECTION ───────────────────────────────────────────────────────

/**
 * Connects to MetaMask and returns the wallet address.
 * Automatically prompts to switch to Sepolia testnet.
 */
export async function connectMetaMask(): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error(
      isMobileDevice()
        ? "MetaMask is not available. Please open the site inside the MetaMask app browser, or enter address manually."
        : "MetaMask is not installed. Please visit metamask.io.",
    );
  }

  try {
    const provider = new BrowserProvider((window as any).ethereum);

    // Request accounts from MetaMask
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in MetaMask.");
    }

    // Ensure we are on Sepolia
    await switchToSepolia();

    return accounts[0];
  } catch (err: any) {
    if (err.code === 4001) {
      throw new Error("Connection request was rejected in MetaMask.");
    }
    throw err;
  }
}

// ─── NETWORK MANAGEMENT ──────────────────────────────────────────────────────

/**
 * Prompts user to switch to Sepolia testnet. Adds it if not already configured.
 */
export async function switchToSepolia(): Promise<void> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error("MetaMask provider not found.");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError: any) {
    // Error code 4902 means the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID,
            chainName: "Sepolia Test Network",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org", "https://ethereum-sepolia-rpc.publicnode.com"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Checks if current connection is on Sepolia testnet
 */
export async function checkNetwork(): Promise<{ ok: boolean; currentChainId?: number }> {
  if (!isMetaMaskAvailable()) return { ok: false };
  try {
    const provider = new BrowserProvider((window as any).ethereum);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    return {
      ok: chainId === SEPOLIA_CHAIN_ID_DECIMAL,
      currentChainId: chainId,
    };
  } catch {
    return { ok: false };
  }
}

// ─── BLOCKCHAIN TRANSACTIONS ────────────────────────────────────────────────

/**
 * Calls the recordDonation function on the smart contract.
 * Admin signs the transaction, but tokens are awarded to the DONOR's address.
 */
export async function recordDonationOnChain(
  donorAddress: string,
  itemName: string,
  isCritical: boolean,
): Promise<DonationResult> {
  try {
    if (!isMetaMaskAvailable()) {
      return {
        success: false,
        error: "MetaMask not found. Use MetaMask browser or enter address manually.",
      };
    }

    const provider = new BrowserProvider((window as any).ethereum);
    await provider.send("eth_requestAccounts", []);
    await switchToSepolia();

    const signer = await provider.getSigner();
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Trigger the contract function
    const tx = await (contract as any).recordDonation(donorAddress, itemName, isCritical);

    // Wait for network confirmation (~15-30 seconds)
    await tx.wait();

    const tokensAwarded = isCritical ? 5 : 3;

    return {
      success: true,
      txHash: tx.hash,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
      tokensAwarded,
      donorAddress,
    };
  } catch (err: any) {
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      return { success: false, error: "Transaction was rejected in MetaMask." };
    }
    if (err.message?.includes("insufficient funds")) {
      return { success: false, error: "Not enough Sepolia ETH for gas. Use a faucet." };
    }
    return { success: false, error: err.message || "Blockchain transaction failed." };
  }
}

// ─── DATA READING ───────────────────────────────────────────────────────────

/**
 * Reads token balance directly from the blockchain (No gas required)
 */
export async function getBlockchainTokenBalance(address: string): Promise<number> {
  try {
    let provider;
    if (isMetaMaskAvailable()) {
      provider = new BrowserProvider((window as any).ethereum);
    } else {
      provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
    }

    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const balance = await (contract as any).getTokenBalance(address);
    return Number(balance);
  } catch {
    return 0;
  }
}

// ─── BACKWARDS COMPATIBILITY ─────────────────────────────────────────────────

/**
 * Alias for getMetaMaskDeepLink — kept for backwards compatibility
 * with components that import this name.
 */
export function getMetaMaskDeepLinkForCurrentPage(): string {
  return getMetaMaskDeepLink();
}
