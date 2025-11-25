interface StatusBadgeProps {
  state: 'available' | 'reserved' | 'sold';
  label: string;
}

const StatusBadge = ({ state, label }: StatusBadgeProps) => {
  const className = `status-badge ${
    state === 'available' ? 'status-available' : state === 'reserved' ? 'status-reserved' : 'status-sold'
  }`;
  return <span className={className}>{label}</span>;
};

export default StatusBadge;
