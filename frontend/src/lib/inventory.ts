import { getContractAddresses } from './contractConfig';
import { getPublicClient } from './web3';
import VehicleNFTAbi from '../abis/VehicleNFT.json';
import VehicleEscrowAbi from '../abis/VehicleEscrow.json';
import type { Address } from 'viem';
import type { VehicleInventoryRow, VehicleMetadata, VehicleDocuments } from '../types/vehicle';

type OnChainMetadata = {
  vin: string;
  make: string;
  model: string;
  year: bigint;
  color: string;
  mileage: bigint;
  condition: string;
  mintedAt: bigint;
};

type OnChainDocuments = {
  titleDeedIPFS: string;
  registrationIPFS: string;
  inspectionIPFS: string;
  serviceHistoryIPFS: string;
};

const bigintToNumber = (value: bigint): number => Number(value);

export const fetchVehicleInventory = async (chainId: number): Promise<VehicleInventoryRow[]> => {
  const { vehicleNFT, vehicleEscrow } = getContractAddresses(chainId);
  const client = getPublicClient(chainId);

  const totalSupply = await client.readContract({
    address: vehicleNFT,
    abi: VehicleNFTAbi,
    functionName: 'totalSupply',
  });

  const supplyNumber = Number(totalSupply);
  if (!supplyNumber) {
    return [];
  }

  // VehicleNFT token ids start at 0 in this implementation, so walk from 0..totalSupply - 1.
  const tokenIds = Array.from({ length: supplyNumber }, (_, index) => BigInt(index));

  const rows = await Promise.all(
    tokenIds.map(async (tokenId) => {
      const [metadata, docs] = (await client.readContract({
        address: vehicleNFT,
        abi: VehicleNFTAbi,
        functionName: 'getVehicleDetails',
        args: [tokenId],
      })) as [OnChainMetadata, OnChainDocuments];

      const owner = (await client.readContract({
        address: vehicleNFT,
        abi: VehicleNFTAbi,
        functionName: 'ownerOf',
        args: [tokenId],
      })) as Address;

      const locked = (await client.readContract({
        address: vehicleNFT,
        abi: VehicleNFTAbi,
        functionName: 'isLocked',
        args: [tokenId],
      })) as boolean;

      let inEscrow = false;
      try {
        inEscrow = (await client.readContract({
          address: vehicleEscrow,
          abi: VehicleEscrowAbi,
          functionName: 'isInEscrow',
          args: [tokenId],
        })) as boolean;
      } catch (error) {
        inEscrow = false;
      }

      const normalizedMetadata: VehicleMetadata = {
        vin: metadata.vin,
        make: metadata.make,
        model: metadata.model,
        year: bigintToNumber(metadata.year),
        color: metadata.color,
        mileage: bigintToNumber(metadata.mileage),
        condition: metadata.condition,
        mintedAt: bigintToNumber(metadata.mintedAt),
      };

      const normalizedDocs: VehicleDocuments = {
        titleDeedIPFS: docs.titleDeedIPFS,
        registrationIPFS: docs.registrationIPFS,
        inspectionIPFS: docs.inspectionIPFS,
        serviceHistoryIPFS: docs.serviceHistoryIPFS,
      };

      return {
        tokenId: Number(tokenId),
        metadata: normalizedMetadata,
        docs: normalizedDocs,
        owner,
        locked,
        inEscrow,
      } satisfies VehicleInventoryRow;
    }),
  );

  return rows;
};
