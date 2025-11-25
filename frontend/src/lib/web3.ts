import {
  type Address,
  type Chain,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
} from 'viem';
import { sepolia } from 'viem/chains';
import { getDefaultChainId, isSupportedChainId } from './contractConfig';

const localhostChain = defineChain({
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
});

const chainDefinitions: Record<number, Chain> = {
  [localhostChain.id]: localhostChain,
  [sepolia.id]: sepolia,
};

const publicClientCache = new Map<number, PublicClient>();

const hasBrowserProvider = (): boolean => typeof window !== 'undefined' && Boolean(window.ethereum);

const getTransport = (chainId: number) => {
  if (hasBrowserProvider()) {
    return custom(window.ethereum!);
  }

  const chain = getChainDefinition(chainId);
  const fallbackUrl = chain.rpcUrls.default.http[0];
  return http(fallbackUrl);
};

export const getChainDefinition = (chainId: number) => {
  const chain = chainDefinitions[chainId];
  if (!chain) {
    throw new Error(`Chain ${chainId} is not configured.`);
  }
  return chain;
};

export const getPublicClient = (chainId: number): PublicClient => {
  if (!publicClientCache.has(chainId)) {
    const client = createPublicClient({
      chain: getChainDefinition(chainId),
      transport: getTransport(chainId),
    });
    publicClientCache.set(chainId, client);
  }

  return publicClientCache.get(chainId)!;
};

export const getWalletClient = async (chainId: number): Promise<WalletClient> => {
  if (!hasBrowserProvider()) {
    throw new Error('Browser wallet extension is required to sign transactions.');
  }

  return createWalletClient({
    chain: getChainDefinition(chainId),
    transport: custom(window.ethereum!),
  });
};

const parseChainId = (chainIdHex: string): number => Number.parseInt(chainIdHex, 16);

export const requestWalletConnection = async () => {
  if (!hasBrowserProvider()) {
    throw new Error('Browser wallet extension is required to connect.');
  }

  const accounts = (await window.ethereum!.request<string[]>({
    method: 'eth_requestAccounts',
  })) ?? [];

  if (!accounts.length) {
    throw new Error('No accounts returned from wallet.');
  }

  const chainIdHex = await window.ethereum!.request<string>({ method: 'eth_chainId' });
  return { address: accounts[0] as Address, chainId: parseChainId(chainIdHex) };
};

export const getExistingAccounts = async () => {
  if (!hasBrowserProvider()) return [] as Address[];
  const accounts = await window.ethereum!.request<string[]>({ method: 'eth_accounts' });
  return (accounts ?? []) as Address[];
};

export const getCurrentChainId = async (): Promise<number | undefined> => {
  if (!hasBrowserProvider()) return undefined;
  const chainIdHex = await window.ethereum!.request<string>({ method: 'eth_chainId' });
  return parseChainId(chainIdHex);
};

export const requestNetworkSwitch = async (targetChainId = getDefaultChainId()) => {
  if (!hasBrowserProvider()) {
    throw new Error('Browser wallet extension is required to switch networks.');
  }

  const hexChainId = `0x${targetChainId.toString(16)}`;
  await window.ethereum!.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: hexChainId }],
  });
};

export const isChainSupportedByWallet = (chainId?: number) => {
  return isSupportedChainId(chainId);
};
