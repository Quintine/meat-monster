import { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { API } from '../services/api';

export default function AdminDashboard({ stock, orders, config, faqs, refreshData, notify, promptConfirm }: any) {
    const [tab, setTab] = useState<'orders' | 'stock' | 'faqs' | 'settings'>('orders');
    const [newAdminCode, setNewAdminCode] = useState('');
    const [settingsForm, setSettingsForm] = useState<any>(null);

    useEffect(() => {
        if (config && !settingsForm) {
            setSettingsForm({
                finalDepositDate: config.finalDepositDate || '',
                cookDay: config.cookDay || '',
                payIdInfo: config.payIdInfo || '',
                termsOfService: config.termsOfService || '',
                orderingPolicy: config.orderingPolicy || '',
                depositPercentage: config.depositPercentage || 30
            });
        }
    }, [config, settingsForm]);

    const handleSaveSettings = async () => {
        if (!settingsForm) return;
        await API.updateConfig(settingsForm);
        notify("Settings Saved");
        setSettingsForm(null);
        refreshData();
    };

    const totalRevenue = orders.reduce((acc: number, order: any) => acc + (order.estimatedTotal || 0), 0);
    const totalKg = orders.reduce((acc: number, order: any) => acc + (order.totalWeight || 0), 0);
    const activeRequests = orders.length;

    const handleUpdatePassword = async () => {
        if (newAdminCode.length < 4) {
            notify("Code must be at least 4 characters");
            return;
        }
        await API.updateConfig({ adminCode: newAdminCode });
        setNewAdminCode('');
        notify("Admin Password Updated");
        refreshData();
    };


    const addNewStockItem = async () => {
        const newItem = {
            name: "New Meat Item",
            category: "Beef",
            price: 20,
            unit: "kg",
            available: false,
            description: "Description here",
            bulk1Threshold: 0, bulk1Price: 0,
            bulk2Threshold: 0, bulk2Price: 0
        };
        await API.updateStock(newItem);
        refreshData();
        notify("New Item Added");
    };

    const updateStockItem = async (id: number, updates: any) => {
        const currentItem = stock.find((s: any) => s.id === id) || { id };
        await API.updateStock({ ...currentItem, ...updates });
        refreshData();
        notify("Stock updated");
    };

    const deleteStockItem = (id: number) => {
        promptConfirm("Permanently delete this item from stock?", async () => {
            await API.deleteStock(id);
            refreshData();
            notify("Item deleted");
        });
    };

    const addNewFAQ = async () => {
        const newFAQ = {
            question: "New Question?",
            answer: "Answer here...",
            order: faqs.length + 1
        };
        await API.updateFAQ(newFAQ);
        refreshData();
        notify("New FAQ Added");
    };

    const updateFAQ = async (id: number, updates: any) => {
        const currentFAQ = faqs.find((f: any) => f.id === id) || { id };
        await API.updateFAQ({ ...currentFAQ, ...updates });
        refreshData();
        notify("FAQ updated");
    };

    const deleteFAQ = (id: number) => {
        promptConfirm("Delete this FAQ?", async () => {
            await API.deleteFAQ(id);
            refreshData();
            notify("FAQ deleted");
        });
    };

    const clearAllOrders = () => {
        promptConfirm("WARNING: This will delete ALL current order history. Proceed?", async () => {
            await API.clearOrders();
            refreshData();
            notify("All Orders Cleared");
        });
    };

    const resetDatabase = () => {
        promptConfirm("Wipe all data and reset to defaults?", async () => {
            await API.resetDB();
            refreshData();
            notify("Database Reset to Defaults");
        });
    };

    return (
        <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden min-h-[600px] shadow-2xl">
            <div className="flex border-b border-stone-800 bg-stone-950">
                <button onClick={() => setTab('orders')} className={`flex-1 py-4 font-bold text-center transition-colors uppercase tracking-wider text-sm ${tab === 'orders' ? 'bg-stone-900 text-red-500 border-t-2 border-red-500' : 'text-stone-600 hover:text-stone-300'}`}>Requests</button>
                <button onClick={() => setTab('stock')} className={`flex-1 py-4 font-bold text-center transition-colors uppercase tracking-wider text-sm ${tab === 'stock' ? 'bg-stone-900 text-red-500 border-t-2 border-red-500' : 'text-stone-600 hover:text-stone-300'}`}>Inventory</button>
                <button onClick={() => setTab('faqs')} className={`flex-1 py-4 font-bold text-center transition-colors uppercase tracking-wider text-sm ${tab === 'faqs' ? 'bg-stone-900 text-red-500 border-t-2 border-red-500' : 'text-stone-600 hover:text-stone-300'}`}>FAQ</button>
                <button onClick={() => setTab('settings')} className={`flex-1 py-4 font-bold text-center transition-colors uppercase tracking-wider text-sm ${tab === 'settings' ? 'bg-stone-900 text-red-500 border-t-2 border-red-500' : 'text-stone-600 hover:text-stone-300'}`}>Settings</button>
            </div>

            <div className="p-6">
                {tab === 'stock' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
                            <h3 className="text-xl font-bold text-white">Stock Configuration</h3>
                            <p className="text-xs text-stone-500">Edit names, prices, and descriptions</p>
                        </div>
                        <div className="grid gap-4">
                            {stock.map((item: any) => (
                                <AdminStockItem key={item.id} item={item} onUpdate={(data: any) => updateStockItem(item.id, data)} onDelete={() => deleteStockItem(item.id)} />
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-10 border-t border-stone-800 mt-10">
                            <button onClick={addNewStockItem} className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 border border-stone-700"><Icons.Plus /> Add New Stock Item</button>
                        </div>
                    </div>
                )}

                {tab === 'faqs' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
                            <h3 className="text-xl font-bold text-white">FAQ Management</h3>
                            <p className="text-xs text-stone-500">Edit frequently asked questions</p>
                        </div>
                        <div className="grid gap-4">
                            {faqs.map((faq: any) => (
                                <AdminFAQItem key={faq.id} item={faq} onUpdate={(data: any) => updateFAQ(faq.id, data)} onDelete={() => deleteFAQ(faq.id)} />
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-10 border-t border-stone-800 mt-10">
                            <button onClick={addNewFAQ} className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 border border-stone-700"><Icons.Plus /> Add New FAQ</button>
                        </div>
                    </div>
                )}

                {tab === 'orders' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#0c0a09] p-4 rounded border border-stone-800 text-center shadow-lg">
                                <p className="text-stone-500 text-[10px] md:text-xs uppercase font-bold tracking-widest mb-1">Est. Revenue</p>
                                <p className="text-2xl md:text-3xl font-black text-green-500">${totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className="bg-[#0c0a09] p-4 rounded border border-stone-800 text-center shadow-lg">
                                <p className="text-stone-500 text-[10px] md:text-xs uppercase font-bold tracking-widest mb-1">Total Prep (kg)</p>
                                <p className="text-2xl md:text-3xl font-black text-stone-200">{totalKg}<span className="text-lg text-stone-600 ml-1">kg</span></p>
                            </div>
                            <div className="bg-[#0c0a09] p-4 rounded border border-stone-800 text-center shadow-lg">
                                <p className="text-stone-500 text-[10px] md:text-xs uppercase font-bold tracking-widest mb-1">Requests</p>
                                <p className="text-2xl md:text-3xl font-black text-red-500">{activeRequests}</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-4 border-b border-stone-800 pb-2">Incoming List</h3>
                        {orders.length === 0 ? (
                            <div className="text-center py-10 bg-stone-950 rounded border border-dashed border-stone-800">
                                <p className="text-stone-500 italic">No active orders. Time to smoke some meat!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order: any) => (
                                    <div key={order.id} className="bg-stone-950 p-5 rounded-lg border border-stone-800 relative group hover:border-stone-700 transition-colors shadow-md">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black bg-red-900/30 text-red-500 px-2 py-0.5 rounded border border-red-900/50 uppercase tracking-tighter">{order.orderNumber || `#${order.id}`}</span>
                                                    <h4 className="font-bold text-lg text-white">{order.name}</h4>
                                                </div>
                                                <p className="text-sm text-stone-300 font-mono">{order.phone}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <select 
                                                    value={order.status || 'Pending'}
                                                    onChange={(e) => API.updateOrderStatus(order.id, e.target.value).then(refreshData)}
                                                    className="bg-stone-900 border border-stone-800 rounded px-2 py-1 text-xs text-stone-400 focus:border-red-600 outline-none"
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Deposit Paid">Deposit Paid</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Cooked">Cooked</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                                <button onClick={() => promptConfirm(`Delete order ${order.orderNumber || order.name}?`, () => API.deleteOrder(order.id).then(refreshData))} className="p-2 text-stone-600 hover:text-red-500 transition-colors bg-stone-900 rounded"><Icons.Trash /></button>
                                            </div>
                                        </div>
                                        <div className="bg-stone-900 rounded p-3 border border-stone-800/50 mb-4">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm py-1 border-b border-stone-800/30 last:border-0">
                                                    <span className="text-stone-300">{item.qty}{item.unit} {item.name}</span>
                                                    <span className="text-stone-500 font-mono">${(item.lineTotal || 0).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="text-[10px] text-stone-500 space-y-1">
                                                <p className="flex items-center gap-1 uppercase font-bold"><Icons.Clock /> {new Date(order.timestamp).toLocaleString('en-AU')}</p>
                                                <p className="flex items-center gap-1 uppercase font-bold"><Icons.ShoppingCart /> {order.totalWeight}kg Weight</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-stone-500 uppercase font-bold">Estimated Total</p>
                                                <p className="text-xl font-black text-red-500">${order.estimatedTotal?.toFixed(2)}</p>
                                                <p className="text-[10px] text-red-800 font-bold uppercase tracking-tighter">30% Deposit: ${(order.estimatedTotal * 0.3).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'settings' && (
                    <div className="max-w-md mx-auto text-center pt-10">
                        <div className="text-stone-500 mb-4 mx-auto flex justify-center"><Icons.Settings /></div>
                        <h3 className="text-xl font-bold text-white mb-6">Admin Settings</h3>
                        {settingsForm ? (
                            <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 mb-8 space-y-6 text-left">
                                <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest border-b border-stone-800 pb-2">Scheduling & Deadlines</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Final Deposit Date</label>
                                        <input 
                                            type="datetime-local" 
                                            value={settingsForm.finalDepositDate} 
                                            onChange={(e) => setSettingsForm({ ...settingsForm, finalDepositDate: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-700 rounded p-3 text-white focus:border-red-600 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Scheduled Cook Day</label>
                                        <input 
                                            type="date" 
                                            value={settingsForm.cookDay} 
                                            onChange={(e) => setSettingsForm({ ...settingsForm, cookDay: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-700 rounded p-3 text-white focus:border-red-600 outline-none" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">PayID Details</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 0400 000 000 or email@domain.com"
                                        value={settingsForm.payIdInfo} 
                                        onChange={(e) => setSettingsForm({ ...settingsForm, payIdInfo: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-700 rounded p-3 text-white focus:border-red-600 outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Deposit Percentage (%)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="100"
                                        value={settingsForm.depositPercentage} 
                                        onChange={(e) => setSettingsForm({ ...settingsForm, depositPercentage: e.target.value })}
                                        className="w-32 bg-stone-900 border border-stone-700 rounded p-3 text-white focus:border-red-600 outline-none" 
                                    />
                                </div>

                                <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest border-b border-stone-800 pb-2 pt-4">Policies & TOS</h4>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Terms of Service</label>
                                    <textarea 
                                        value={settingsForm.termsOfService} 
                                        onChange={(e) => setSettingsForm({ ...settingsForm, termsOfService: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-700 rounded p-3 text-white focus:border-red-600 outline-none h-24 text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Ordering Policy Footer</label>
                                    <textarea 
                                        value={settingsForm.orderingPolicy} 
                                        onChange={(e) => setSettingsForm({ ...settingsForm, orderingPolicy: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-700 rounded p-3 text-white focus:border-red-600 outline-none h-24 text-sm" 
                                    />
                                </div>

                                <button 
                                    onClick={handleSaveSettings} 
                                    className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3.5 rounded-lg transition-colors uppercase tracking-widest text-xs font-black shadow-lg shadow-red-900/20 active:scale-[0.98]"
                                >
                                    Save Settings
                                </button>
                            </div>
                        ) : (
                            <div className="text-stone-500 py-10 italic">Loading settings...</div>
                        )}

                        <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 mb-8">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2 text-left">Update Admin Password</label>
                            <input type="text" placeholder="New Code" value={newAdminCode} onChange={(e) => setNewAdminCode(e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded p-3 text-white mb-4 focus:border-red-600 outline-none" />
                            <button onClick={handleUpdatePassword} disabled={!newAdminCode} className="w-full bg-red-700 hover:bg-red-600 disabled:bg-stone-800 disabled:text-stone-600 text-white font-bold py-3 rounded transition-colors">Update Password</button>
                        </div>
                        <div className="space-y-4 border-t border-stone-800 pt-8">
                            <p className="text-xs font-bold text-stone-500 uppercase">Danger Zone</p>
                            <button onClick={clearAllOrders} className="w-full py-3 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded text-sm font-bold transition-colors">Clear All Order History</button>
                            <button onClick={resetDatabase} className="text-xs text-stone-600 hover:text-red-500 underline block w-full">Reset Entire Database to Defaults</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AdminFAQItem({ item, onUpdate, onDelete }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});

    useEffect(() => {
        if (!isEditing) {
            setEditData({
                question: item.question || "",
                answer: item.answer || "",
                order: item.order || 0
            });
        }
    }, [item, isEditing]);

    const handleSave = () => {
        onUpdate({
            ...editData,
            order: parseInt(editData.order)
        });
        setIsEditing(false);
    };

    return (
        <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    {!isEditing ? (
                        <div className="flex-1">
                            <p className="font-bold text-white text-lg">{item.question}</p>
                            <p className="text-sm text-stone-400">{item.answer}</p>
                            <p className="text-[10px] text-stone-600 mt-2 uppercase font-bold">Display Order: {item.order}</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-2 mr-4">
                            <input type="text" value={editData.question} onChange={e => setEditData({ ...editData, question: e.target.value })} className="bg-black text-white border border-stone-700 rounded px-2 py-1 font-bold w-full" placeholder="Question" />
                            <textarea value={editData.answer} onChange={e => setEditData({ ...editData, answer: e.target.value })} className="bg-black text-stone-400 border border-stone-700 rounded px-2 py-1 text-sm w-full h-24" placeholder="Answer" />
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] text-stone-500 uppercase font-bold">Order:</label>
                                <input type="number" value={editData.order} onChange={e => setEditData({ ...editData, order: e.target.value })} className="bg-black text-white border border-stone-700 rounded px-2 py-0.5 text-xs w-20" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded"><Icons.Save /></button>
                            <button onClick={onDelete} className="p-2 bg-red-900 hover:bg-red-700 text-white rounded"><Icons.Trash /></button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded"><Icons.Edit /></button>
                    )}
                </div>
            </div>
        </div>
    );
}

function AdminStockItem({ item, onUpdate, onDelete }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});

    useEffect(() => {
        if (!isEditing) {
            setEditData({
                name: item.name || "",
                category: item.category || "",
                description: item.description || "",
                price: item.price || 0,
                unit: item.unit || "kg",
                bulk1Threshold: item.bulk1Threshold || 0,
                bulk1Price: item.bulk1Price || 0,
                bulk2Threshold: item.bulk2Threshold || 0,
                bulk2Price: item.bulk2Price || 0,
                maxStock: item.maxStock ?? ''
            });
        }
    }, [item, isEditing]);

    const handleSave = () => {
        onUpdate({
            ...editData,
            price: parseFloat(editData.price),
            bulk1Threshold: parseFloat(editData.bulk1Threshold),
            bulk1Price: parseFloat(editData.bulk1Price),
            bulk2Threshold: parseFloat(editData.bulk2Threshold),
            bulk2Price: parseFloat(editData.bulk2Price),
            maxStock: editData.maxStock !== '' && editData.maxStock !== null ? parseFloat(editData.maxStock) : null
        });
        setIsEditing(false);
    };

    return (
        <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    {!isEditing ? (
                        <div className="flex-1">
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.15em] border border-stone-800 px-2 py-0.5 rounded bg-stone-900 inline-block mb-1">{item.category}</span>
                            <p className="font-bold text-white text-lg">{item.name}</p>
                            <p className="text-xs text-stone-500 italic">{item.description}</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-2 mr-4">
                            <input type="text" value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} className="bg-black text-stone-500 border border-stone-700 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest w-32" placeholder="Meat Type (e.g. Beef)" />
                            <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="bg-black text-white border border-stone-700 rounded px-2 py-1 font-bold w-full" placeholder="Item Name" />
                            <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} className="bg-black text-stone-400 border border-stone-700 rounded px-2 py-1 text-xs w-full h-16" placeholder="Description" />
                        </div>
                    )}
                    {!isEditing && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.available ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>{item.available ? 'Active' : 'Disabled'}</span>}
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded"><Icons.Save /></button>
                            <button onClick={onDelete} className="p-2 bg-red-900 hover:bg-red-700 text-white rounded"><Icons.Trash /></button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded"><Icons.Edit /></button>
                    )}
                    <button onClick={() => onUpdate({ available: !item.available })} className={`px-3 py-2 rounded font-bold text-xs uppercase w-24 text-center ${item.available ? 'bg-stone-800 text-red-400 border border-red-900/30 hover:bg-red-900/20' : 'bg-green-900/20 text-green-400 border border-green-900/30 hover:bg-green-900/40'}`}>{item.available ? 'Sold Out' : 'Activate'}</button>
                </div>
            </div>
            {!isEditing ? (
                <div className="text-sm text-stone-500 flex flex-wrap gap-4">
                    <span className="bg-stone-900 px-2 py-1 rounded">Standard: <b className="text-stone-300">${item.price}/{item.unit}</b></span>
                    {item.bulk1Threshold > 0 && <span className="bg-stone-900 px-2 py-1 rounded text-yellow-600">Tier 1: <b className="text-yellow-500">${item.bulk1Price}</b> @ {item.bulk1Threshold}{item.unit}+</span>}
                    {item.bulk2Threshold > 0 && <span className="bg-stone-900 px-2 py-1 rounded text-green-600">Tier 2: <b className="text-green-500">${item.bulk2Price}</b> @ {item.bulk2Threshold}{item.unit}+</span>}
                    {item.maxStock !== null && item.maxStock !== undefined && (
                        <span className="bg-stone-900 px-2 py-1 rounded text-blue-400">
                            Stock: <b className="text-blue-300">{item.orderedQty || 0}/{item.maxStock}{item.unit}</b> ordered
                            {' · '}<b className={item.remainingStock <= 0 ? 'text-red-400' : 'text-green-400'}>{item.remainingStock ?? 0}{item.unit} left</b>
                        </span>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-900 p-3 rounded border border-stone-700">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-400 uppercase">Base Info</p>
                        <label className="block text-[10px] text-stone-500">Price ($)</label>
                        <input type="number" value={editData.price} onChange={e => setEditData({ ...editData, price: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                        <label className="block text-[10px] text-stone-500">Unit (kg/ea)</label>
                        <input type="text" value={editData.unit} onChange={e => setEditData({ ...editData, unit: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                        <label className="block text-[10px] text-stone-500">Stock Limit ({editData.unit}) — leave blank for unlimited</label>
                        <input type="number" value={editData.maxStock} onChange={e => setEditData({ ...editData, maxStock: e.target.value })} placeholder="Unlimited" className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="space-y-2 border-l border-stone-800 pl-4">
                        <p className="text-xs font-bold text-yellow-500 uppercase">Tier 1 Bulk</p>
                        <label className="block text-[10px] text-stone-500">Threshold ({editData.unit})</label>
                        <input type="number" value={editData.bulk1Threshold} onChange={e => setEditData({ ...editData, bulk1Threshold: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                        <label className="block text-[10px] text-stone-500">Price ($)</label>
                        <input type="number" value={editData.bulk1Price} onChange={e => setEditData({ ...editData, bulk1Price: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="space-y-2 border-l border-stone-800 pl-4">
                        <p className="text-xs font-bold text-green-500 uppercase">Tier 2 Super Bulk</p>
                        <label className="block text-[10px] text-stone-500">Threshold ({editData.unit})</label>
                        <input type="number" value={editData.bulk2Threshold} onChange={e => setEditData({ ...editData, bulk2Threshold: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                        <label className="block text-[10px] text-stone-500">Price ($)</label>
                        <input type="number" value={editData.bulk2Price} onChange={e => setEditData({ ...editData, bulk2Price: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                    </div>
                </div>
            )}
        </div>
    );
}
