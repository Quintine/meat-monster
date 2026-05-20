export const API_BASE = import.meta.env.VITE_API_URL || '';

export const API = {
    fetchData: () => fetch(`${API_BASE}/api/data`).then(res => res.json()),
    submitOrder: (order: any) => fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
    }).then(res => res.json()),
    deleteOrder: (id: number) => fetch(`${API_BASE}/api/orders/${id}`, { method: 'DELETE' }),
    clearOrders: () => fetch(`${API_BASE}/api/orders`, { method: 'DELETE' }),
    updateStock: (item: any) => fetch(`${API_BASE}/api/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    }).then(res => res.json()),
    deleteStock: (id: number) => fetch(`${API_BASE}/api/stock/${id}`, { method: 'DELETE' }),
    updateConfig: (cfg: any) => fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
    }),
    resetDB: () => fetch(`${API_BASE}/api/reset`, { method: 'POST' })
};
