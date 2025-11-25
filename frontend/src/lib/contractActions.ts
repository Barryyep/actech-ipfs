import type { Address } from 'viem';
import { getContractAddresses } from './contractConfig';
import { getPublicClient } from './web3';
import VehicleNFTAbi from '../abis/VehicleNFT.json';

export const fetchContractOwner = async (chainId: number): Promise<Address> => {
  const { vehicleNFT } = getContractAddresses(chainId);
  const client = getPublicClient(chainId);
  return (await client.readContract({
    address: vehicleNFT,
    abi: VehicleNFTAbi,
    functionName: 'owner',
  })) as Address;
};

export const isContractOwner = async (chainId: number, walletAddress: Address): Promise<boolean> => {
  const owner = await fetchContractOwner(chainId);
  return owner.toLowerCase() === walletAddress.toLowerCase();
};
