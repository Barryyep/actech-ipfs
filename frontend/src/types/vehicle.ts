import type { Address } from 'viem';

export interface VehicleMetadata {
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  condition: string;
  mintedAt: number;
}

export interface VehicleDocuments {
  titleDeedIPFS: string;
  registrationIPFS: string;
  inspectionIPFS: string;
  serviceHistoryIPFS: string;
}

export interface VehicleInventoryRow {
  tokenId: number;
  metadata: VehicleMetadata;
  docs: VehicleDocuments;
  owner: Address;
  locked: boolean;
  inEscrow: boolean;
}

export interface VehicleFormState {
  vin: string;
  make: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  condition: string;
}

export interface VehicleDocumentFiles {
  titleDeed?: File | null;
  registration?: File | null;
  inspection?: File | null;
  serviceHistory?: File | null;
  photo?: File | null;
}
