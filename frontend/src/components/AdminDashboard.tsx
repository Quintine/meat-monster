import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { API } from '../services/api';

export default function AdminDashboard({ stock, orders, refreshData, notify, promptConfirm }: any) {
    const [tab, setTab] = useState<'orders' | 'stock' | 'settings'>('orders');
    const [newAdminCode, setNewAdminCode] = useState('');

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

    const deleteOrder = (id: number) => {
        promptConfirm("Delete this order record?", async () => {
            await API.deleteOrder(id);
            refreshData();
            notify("Order Deleted");
        });
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
                                                <h4 className="font-bold text-lg text-red-400">{order.name}</h4>
                                                <p className="text-sm text-stone-300 font-mono mb-1">{order.phone}</p>
                                                <p className="text-xs text-stone-500">{new Date(order.timestamp).toLocaleString()}</p>
                                            </div>
                                            <button onClick={() => deleteOrder(order.id)} className="text-stone-600 hover:text-red-500 transition-colors bg-stone-900 p-2 rounded"><Icons.Trash /></button>
                                        </div>
                                        <div className="bg-stone-900 rounded p-3 border border-stone-800/50">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm py-2 border-b border-stone-800 last:border-0">
                                                    <div>
                                                        <span className="text-stone-300 font-bold block">{item.name}</span>
                                                        <span className="text-stone-500 text-xs">{item.qty}{item.unit} @ ${item.finalPricePerUnit || item.price}/{item.unit}</span>
                                                    </div>
                                                    <span className="text-stone-400 font-mono">${(item.lineTotal || 0).toFixed(2)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between mt-3 pt-3 border-t border-stone-800 font-bold">
                                                <span className="text-white">Total Est.</span>
                                                <span className="text-red-500">${order.estimatedTotal?.toFixed(2)}</span>
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

function AdminStockItem({ item, onUpdate, onDelete }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});

    useEffect(() => {
        setEditData({
            name: item.name || "",
            category: item.category || "",
            description: item.description || "",
            price: item.price || 0,
            unit: item.unit || "kg",
            bulk1Threshold: item.bulk1Threshold || 0,
            bulk1Price: item.bulk1Price || 0,
            bulk2Threshold: item.bulk2Threshold || 0,
            bulk2Price: item.bulk2Price || 0
        });
    }, [item]);

    const handleSave = () => {
        onUpdate({
            ...editData,
            price: parseFloat(editData.price),
            bulk1Threshold: parseFloat(editData.bulk1Threshold),
            bulk1Price: parseFloat(editData.bulk1Price),
            bulk2Threshold: parseFloat(editData.bulk2Threshold),
            bulk2Price: parseFloat(editData.bulk2Price)
        });
        setIsEditing(false);
    };

    return (
        <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    {!isEditing ? (
                        <div className="flex-1">
                            <p className="font-bold text-white text-lg">{item.name}</p>
                            <p className="text-xs text-stone-500 italic">{item.description}</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-2 mr-4">
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
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-900 p-3 rounded border border-stone-700">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-400 uppercase">Base Info</p>
                        <label className="block text-[10px] text-stone-500">Price ($)</label>
                        <input type="number" value={editData.price} onChange={e => setEditData({ ...editData, price: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
                        <label className="block text-[10px] text-stone-500">Unit (kg/ea)</label>
                        <input type="text" value={editData.unit} onChange={e => setEditData({ ...editData, unit: e.target.value })} className="w-full bg-black text-white border border-stone-700 rounded px-2 py-1 text-sm" />
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
