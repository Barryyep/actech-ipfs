import rawAddresses from '../config/deployed-addresses.json';
import type { Address } from 'viem';

type DeployedEntry = {
  VehicleNFT: string;
  VehicleEscrow: string;
  networkName: string;
  networkId: string;
  deployer: string;
};

const parsedAddresses: Record<number, DeployedEntry> = Object.entries(rawAddresses).reduce(
  (acc, [chainId, entry]) => {
    acc[Number(chainId)] = entry as DeployedEntry;
    return acc;
  },
  {} as Record<number, DeployedEntry>,
);

export const SUPPORTED_CHAIN_IDS = Object.keys(parsedAddresses).map(Number);

export interface ContractAddresses {
  vehicleNFT: Address;
  vehicleEscrow: Address;
  networkName: string;
}

export const getContractAddresses = (chainId: number): ContractAddresses => {
  const entry = parsedAddresses[chainId];
  if (!entry) {
    throw new Error(`Unsupported network (chain id ${chainId}).`);
  }

  return {
    vehicleNFT: entry.VehicleNFT as Address,
    vehicleEscrow: entry.VehicleEscrow as Address,
    networkName: entry.networkName ?? 'Unknown',
  };
};

export const isSupportedChainId = (chainId?: number): chainId is number => {
  if (typeof chainId !== 'number') return false;
  return Boolean(parsedAddresses[chainId]);
};

export const getNetworkDisplayName = (chainId?: number): string => {
  if (typeof chainId !== 'number') return 'Disconnected';
  return parsedAddresses[chainId]?.networkName ?? 'Unsupported';
};

export const getDefaultChainId = (): number => SUPPORTED_CHAIN_IDS[0];
