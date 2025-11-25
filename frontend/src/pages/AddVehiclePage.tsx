import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import VehicleNFTAbi from '../abis/VehicleNFT.json';
import { isContractOwner } from '../lib/contractActions';
import { getContractAddresses, getNetworkDisplayName, isSupportedChainId } from '../lib/contractConfig';
import { uploadFileToIpfs, uploadJsonToIpfs } from '../lib/ipfs';
import { getChainDefinition, getPublicClient, getWalletClient } from '../lib/web3';
import { useWallet } from '../state/walletStore';
import type { VehicleDocumentFiles, VehicleFormState } from '../types/vehicle';

const formDefaults: VehicleFormState = {
  vin: '',
  make: '',
  model: '',
  year: '',
  color: '',
  mileage: '',
  condition: '',
};

const AddVehiclePage = () => {
  const navigate = useNavigate();
  const { address, chainId, status } = useWallet();
  const [form, setForm] = useState<VehicleFormState>(formDefaults);
  const [docs, setDocs] = useState<VehicleDocumentFiles>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportedChainId = isSupportedChainId(chainId) ? chainId : undefined;
  const connectionNeeded = status !== 'connected';
  const unsupportedNetwork = status === 'connected' && !supportedChainId && chainId !== undefined;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = event.target;
    setDocs((prev) => ({ ...prev, [name]: files?.[0] ?? null }));
  };

  const validateForm = () => {
    const missingField = Object.entries(form).find(([, value]) => !value.trim());
    if (missingField) {
      throw new Error('All metadata fields are required.');
    }

    const yearValue = Number.parseInt(form.year, 10);
    const mileageValue = Number.parseInt(form.mileage, 10);
    if (Number.isNaN(yearValue) || Number.isNaN(mileageValue)) {
      throw new Error('Year and mileage must be valid numbers.');
    }

    if (!docs.photo) {
      throw new Error('Vehicle photo is required.');
    }

    return { yearValue, mileageValue };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (connectionNeeded || !address) {
      setError('Please connect your wallet before minting.');
      return;
    }

    if (!supportedChainId) {
      setError('Switch to a supported network to mint.');
      return;
    }

    let yearValue: number;
    let mileageValue: number;
    try {
      ({ yearValue, mileageValue } = validateForm());
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'Invalid form data.';
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setError(null);

    let toastId: string | undefined;

    try {
      const owner = await isContractOwner(supportedChainId, address);
      if (!owner) {
        throw new Error('Only the contract owner can mint new vehicles.');
      }

      toastId = toast.loading('Uploading documents to IPFS…');

      const docEntries: [keyof VehicleDocumentFiles, File][] = ([
        ['titleDeed', docs.titleDeed],
        ['registration', docs.registration],
        ['inspection', docs.inspection],
        ['serviceHistory', docs.serviceHistory],
      ] as const)
        .filter(([, file]) => Boolean(file))
        .map(([key, file]) => [key, file!] as [keyof VehicleDocumentFiles, File]);

      const uploadedDocs = await Promise.all(
        docEntries.map(async ([key, file]) => ({ key, cid: await uploadFileToIpfs(file) })),
      );

      const docMap = uploadedDocs.reduce<Record<keyof VehicleDocumentFiles, string>>((acc, { key, cid }) => {
        acc[key] = `ipfs://${cid}`;
        return acc;
      }, {} as Record<keyof VehicleDocumentFiles, string>);

      toast.dismiss(toastId);
      toastId = toast.loading('Uploading vehicle photo…');
      const imageCid = await uploadFileToIpfs(docs.photo!);

      toast.dismiss(toastId);
      toastId = toast.loading('Preparing token metadata…');

      const metadataStruct = {
        vin: form.vin.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: BigInt(yearValue),
        color: form.color.trim(),
        mileage: BigInt(mileageValue),
        condition: form.condition.trim(),
        mintedAt: BigInt(Math.floor(Date.now() / 1000)),
      };

      const tokenMetadata = {
        name: `${form.year} ${form.make} ${form.model}`.trim(),
        description: `AC Future vehicle NFT for VIN ${form.vin.trim()}.`,
        image: `ipfs://${imageCid}`,
        attributes: [
          { trait_type: 'VIN', value: form.vin.trim() },
          { trait_type: 'Color', value: form.color.trim() },
          { trait_type: 'Mileage', value: mileageValue },
          { trait_type: 'Condition', value: form.condition.trim() },
        ],
      };

      const tokenCid = await uploadJsonToIpfs(tokenMetadata);
      const tokenURI = `ipfs://${tokenCid}`;

      toast.dismiss(toastId);
      toastId = toast.loading('Sending transaction…');

      const walletClient = await getWalletClient(supportedChainId);
      const { vehicleNFT } = getContractAddresses(supportedChainId);
      const hash = await walletClient.writeContract({
        account: address,
        address: vehicleNFT,
        abi: VehicleNFTAbi,
        chain: getChainDefinition(supportedChainId),
        functionName: 'mintVehicle',
        args: [
          address,
          metadataStruct,
          {
            titleDeedIPFS: docMap.titleDeed ?? 'ipfs://title-deed-placeholder',
            registrationIPFS: docMap.registration ?? 'ipfs://registration-placeholder',
            inspectionIPFS: docMap.inspection ?? 'ipfs://inspection-placeholder',
            serviceHistoryIPFS: docMap.serviceHistory ?? 'ipfs://service-history-placeholder',
          },
          tokenURI,
        ],
      });

      const publicClient = getPublicClient(supportedChainId);
      await publicClient.waitForTransactionReceipt({ hash });

      const totalSupply = await publicClient.readContract({
        address: vehicleNFT,
        abi: VehicleNFTAbi,
        functionName: 'totalSupply',
      });

      toast.dismiss(toastId);
      toast.success(`Vehicle minted successfully. Token #${Number(totalSupply)}.`);

      setForm(formDefaults);
      setDocs({});
      navigate('/inventory');
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
      const message = err instanceof Error ? err.message : 'Failed to mint vehicle.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surface-card">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Vehicle</h1>
          <p className="page-subtitle">Upload documents to IPFS and mint a new NFT</p>
        </div>
      </div>

      {connectionNeeded && <p className="helper-text">Connect your wallet to begin.</p>}
      {unsupportedNetwork && (
        <p className="error-text">
          Switch to a supported network. Current network: {getNetworkDisplayName(chainId)}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="input-group">
            <label htmlFor="vin">VIN</label>
            <input id="vin" name="vin" value={form.vin} onChange={handleInputChange} required disabled={submitting} />
          </div>
          <div className="input-group">
            <label htmlFor="make">Make</label>
            <input id="make" name="make" value={form.make} onChange={handleInputChange} required disabled={submitting} />
          </div>
          <div className="input-group">
            <label htmlFor="model">Model</label>
            <input id="model" name="model" value={form.model} onChange={handleInputChange} required disabled={submitting} />
          </div>
          <div className="input-group">
            <label htmlFor="year">Year</label>
            <input
              id="year"
              name="year"
              type="number"
              value={form.year}
              onChange={handleInputChange}
              required
              disabled={submitting}
            />
          </div>
          <div className="input-group">
            <label htmlFor="color">Color</label>
            <input id="color" name="color" value={form.color} onChange={handleInputChange} required disabled={submitting} />
          </div>
          <div className="input-group">
            <label htmlFor="mileage">Mileage</label>
            <input
              id="mileage"
              name="mileage"
              type="number"
              value={form.mileage}
              onChange={handleInputChange}
              required
              disabled={submitting}
            />
          </div>
          <div className="input-group">
            <label htmlFor="condition">Condition</label>
            <input id="condition" name="condition" value={form.condition} onChange={handleInputChange} required disabled={submitting} />
          </div>
        </div>

        <h3 className="form-section-title">Vehicle Image</h3>
        <div className="form-grid">
          <div className="input-group">
            <label htmlFor="photo">Primary Photo</label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              disabled={submitting}
            />
            <span className="helper-text">Photo is required and becomes the NFT image.</span>
          </div>
        </div>

        <h3 className="form-section-title">Documents (optional)</h3>
        <div className="form-grid">
          <div className="input-group">
            <label htmlFor="titleDeed">Title Deed</label>
            <input
              id="titleDeed"
              name="titleDeed"
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              disabled={submitting}
            />
          </div>
          <div className="input-group">
            <label htmlFor="registration">Registration</label>
            <input
              id="registration"
              name="registration"
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              disabled={submitting}
            />
          </div>
          <div className="input-group">
            <label htmlFor="inspection">Inspection Report</label>
            <input
              id="inspection"
              name="inspection"
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              disabled={submitting}
            />
          </div>
          <div className="input-group">
            <label htmlFor="serviceHistory">Service History</label>
            <input
              id="serviceHistory"
              name="serviceHistory"
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              disabled={submitting}
            />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="form-actions">
          <button className="primary-btn" type="submit" disabled={submitting || connectionNeeded || !supportedChainId}>
            {submitting ? 'Minting…' : 'Mint Vehicle'}
          </button>
          <span className="helper-text">Files will be uploaded to IPFS via the remote gateway.</span>
        </div>
      </form>
    </section>
  );
};

export default AddVehiclePage;
