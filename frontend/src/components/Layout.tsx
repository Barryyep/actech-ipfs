import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useWallet } from '../state/walletStore';
import { getDefaultChainId, isSupportedChainId } from '../lib/contractConfig';
import { shortenAddress } from '../lib/utils';

const NAV_LINKS = [
  { label: 'Inventory', to: '/inventory' },
  { label: 'Add Vehicle', to: '/add-vehicle' },
];

const Layout = ({ children }: { children: ReactNode }) => {
  const { address, chainId, networkName, status, connect, requestSwitch, error, ownerStatus } = useWallet();
  const isConnected = status === 'connected' && Boolean(address);
  const supported = isSupportedChainId(chainId);
  const accessDenied = status === 'connected' && ownerStatus === 'denied';
  const verifyingOwner = status === 'connected' && ownerStatus === 'checking';
  const awaitingOwnerVerification =
    status === 'connected' && ownerStatus !== 'allowed' && !accessDenied && !verifyingOwner;

  const determineButtonState = () => {
    if (status === 'connecting') {
      return { label: 'Connecting…', disabled: true, action: async () => {} };
    }

    if (!isConnected) {
      return {
        label: 'Connect Wallet',
        disabled: false,
        action: async () => {
          try {
            await connect();
          } catch (err) {
            console.error(err);
          }
        },
      };
    }

    if (!supported) {
      return {
        label: 'Switch Network',
        disabled: false,
        action: async () => {
          try {
            await requestSwitch(getDefaultChainId());
          } catch (err) {
            console.error(err);
          }
        },
      };
    }

    return { label: 'Connected', disabled: true, action: async () => {} };
  };

  const { label, disabled, action } = determineButtonState();

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">AC Future Merchant Console</div>
        <div className="nav-links">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="wallet-cluster">
          <span className={`wallet-pill ${supported || !chainId ? '' : 'error'}`}>
            {chainId ? networkName : 'No Network'}
          </span>
          <span className="wallet-pill">{address ? shortenAddress(address) : 'No Wallet'}</span>
          <button className="primary-btn" onClick={() => void action()} disabled={disabled} type="button">
            {label}
          </button>
        </div>
      </nav>
      {error && <div className="helper-text" style={{ padding: '0 2rem', color: 'var(--color-error)' }}>{error}</div>}
      {verifyingOwner && (
        <div className="helper-text" style={{ padding: '0 2rem', color: 'var(--color-gold)' }}>Verifying contract ownership…</div>
      )}
      <main className="main-content">
        {accessDenied && (
          <div className="surface-card access-denied">
            <h2>Access Restricted</h2>
            <p>Only the VehicleNFT contract owner may access the merchant console.</p>
            <p className="helper-text">Please switch to the owner wallet and reload.</p>
          </div>
        )}
        {awaitingOwnerVerification && (
          <div className="surface-card access-denied">
            <h2>Awaiting Verification</h2>
            <p>Verifying ownership of the connected wallet…</p>
          </div>
        )}
        {!accessDenied && !awaitingOwnerVerification && children}
      </main>
    </div>
  );
};

export default Layout;
