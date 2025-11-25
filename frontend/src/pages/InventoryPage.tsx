import StatusBadge from '../components/StatusBadge';
import { useInventory } from '../hooks/useInventory';
import { getNetworkDisplayName, isSupportedChainId } from '../lib/contractConfig';
import { formatDateFromUnix, formatMileage, getIpfsGatewayUrl, shortenAddress } from '../lib/utils';
import { useWallet } from '../state/walletStore';

const InventoryPage = () => {
  const { chainId, status, contractOwner } = useWallet();
  const supportedChainId = isSupportedChainId(chainId) ? chainId : undefined;
  const { rows, loading, error, refresh } = useInventory(supportedChainId);

  const renderStatusBadge = (tokenOwner: string, inEscrow: boolean) => {
    if (inEscrow) return <StatusBadge state="reserved" label="Reserved" />;
    const contractOwnerLower = contractOwner?.toLowerCase();
    if (contractOwnerLower && tokenOwner.toLowerCase() !== contractOwnerLower) {
      return <StatusBadge state="sold" label="Sold" />;
    }
    return <StatusBadge state="available" label="Available" />;
  };

  const connectionNeeded = status !== 'connected';
  const unsupportedNetwork = status === 'connected' && !supportedChainId && chainId !== undefined;

  return (
    <section className="surface-card">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Inventory</h1>
          <p className="page-subtitle">Live on-chain state for all tokenized vehicles</p>
        </div>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => refresh()}
            disabled={loading || !supportedChainId}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {connectionNeeded && <p className="helper-text">Connect your wallet to view the fleet inventory.</p>}
      {unsupportedNetwork && (
        <p className="error-text">
          Switch to a supported network to load inventory. Current network: {getNetworkDisplayName(chainId)}
        </p>
      )}
      {error && <p className="error-text">{error}</p>}

      {!supportedChainId && !connectionNeeded && !unsupportedNetwork && (
        <p className="helper-text">Select a supported chain to continue.</p>
      )}

      {supportedChainId && loading && <p className="helper-text">Loading inventory…</p>}

      {supportedChainId && !loading && rows.length === 0 && (
        <div className="empty-state">No vehicles minted yet.</div>
      )}

      {supportedChainId && rows.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>VIN</th>
                <th>Vehicle</th>
                <th>Mileage</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tokenId}>
                  <td>#{row.tokenId}</td>
                  <td>
                    <div>{row.metadata.vin}</div>
                    <span className="helper-text">Minted {formatDateFromUnix(row.metadata.mintedAt)}</span>
                  </td>
                  <td>
                    <div>
                      {row.metadata.year} {row.metadata.make} {row.metadata.model}
                    </div>
                    <span className="helper-text">{row.metadata.color}</span>
                  </td>
                  <td>{formatMileage(row.metadata.mileage)}</td>
                  <td>{shortenAddress(row.owner)}</td>
                  <td>{renderStatusBadge(row.owner, row.inEscrow)}</td>
                  <td>
                    <div className="doc-links">
                      {Object.entries(row.docs).map(([label, cid]) => {
                        const href = getIpfsGatewayUrl(cid);
                        if (!cid || !href) return null;
                        return (
                          <a key={label} href={href} target="_blank" rel="noreferrer">
                            {label.replace('IPFS', '')}
                          </a>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default InventoryPage;
