export const API_BASE = import.meta.env.VITE_API_URL || '';

let adminCode: string | null = null;

interface DataResponse {
    stock?: Array<Record<string, unknown>>;
    orders?: Array<Record<string, unknown>>;
    faqs?: Array<Record<string, unknown>>;
    config?: Record<string, unknown>;
}

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

const request = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers);
    if (adminCode) headers.set('x-admin-code', adminCode);

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const text = await res.text();
    let data: unknown = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!res.ok) {
        const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Request failed (${res.status})`;
        throw new ApiError(message, res.status);
    }

    return data as T;
};

export const API = {
    fetchData: () => request<DataResponse>('/api/data'),
    submitOrder: (order: any) => request('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        }),
    updateOrderStatus: (id: number, status: string) => request(`/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        }),
    deleteOrder: (id: number) => request(`/api/orders/${id}`, { method: 'DELETE' }),
    resetBatch: () => request('/api/batches/reset', { method: 'POST' }),
    updateStock: (item: any) => request('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    }),
    deleteStock: (id: number) => request(`/api/stock/${id}`, { method: 'DELETE' }),
    updateConfig: (cfg: any) => request('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
    }),
    updateFAQ: (faq: any) => request('/api/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faq)
    }),
    deleteFAQ: (id: number) => request(`/api/faqs/${id}`, { method: 'DELETE' }),
    login: async (code: string) => {
        const result = await request('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        adminCode = code;
        return result;
    },
    setAdminCode: (code: string) => {
        adminCode = code;
    },
    logout: () => {
        adminCode = null;
    }
};
