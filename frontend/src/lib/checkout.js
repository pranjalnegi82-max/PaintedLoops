export const pendingKey = () => `pl-checkout-pending-${localStorage.getItem('pl-user-id') || 'legacy'}`;
