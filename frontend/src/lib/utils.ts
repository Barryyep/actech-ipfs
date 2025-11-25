export const shortenAddress = (address?: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

export const formatMileage = (value: number): string => {
  if (!Number.isFinite(value)) return '—';
  return `${formatNumber(value)} mi`;
};

export const formatDateFromUnix = (value?: number): string => {
  if (!value) return '—';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getIpfsGatewayUrl = (cid?: string): string | null => {
  if (!cid) return null;
  const rawCid = cid.replace('ipfs://', '');
  return `http://127.0.0.1:8080/ipfs/${rawCid}`;
};
