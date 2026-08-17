'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api/apiClient';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

interface CreateInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateInvoiceModal({ onClose, onSuccess }: CreateInvoiceModalProps) {
  const [clientName, setClientName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, rate: 0, total: 0 }
  ]);
  const [applyGst, setApplyGst] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateSubtotal = () => items.reduce((acc, item) => acc + item.total, 0);
  
  const subtotal = calculateSubtotal();
  const gstAmount = applyGst ? subtotal * 0.18 : 0;
  const grandTotal = subtotal + gstAmount;

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.total = (Number(updatedItem.quantity) || 0) * (Number(updatedItem.rate) || 0);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !dueDate || items.some(i => !i.description)) {
      alert('Please fill out all required fields.');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        clientName,
        projectId,
        dueDate,
        items,
        subtotal,
        gstAmount,
        totalAmount: grandTotal,
        status: 'DRAFT'
      };
      await apiClient.post('/invoices', payload);
      onSuccess();
    } catch (error) {
      console.error('Failed to create invoice', error);
      alert('Error creating invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h2 className="text-xl font-bold">Create Invoice</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="invoiceForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Client Name *</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Project ID (Optional)</label>
                <input 
                  type="text" 
                  value={projectId} 
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="PRJ-2026-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Due Date *</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Line Items</h3>
                <button type="button" onClick={addItem} className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={item.description}
                      onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                      className="flex-1 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input 
                      type="number" 
                      min="1"
                      value={item.quantity}
                      onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                      placeholder="Qty"
                      className="w-24 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input 
                      type="number" 
                      min="0"
                      value={item.rate}
                      onChange={e => handleItemChange(item.id, 'rate', Number(e.target.value))}
                      placeholder="Rate"
                      className="w-32 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <div className="w-32 font-mono text-right p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                      ₹{item.total.toLocaleString()}
                    </div>
                    <button type="button" onClick={() => removeItem(item.id)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between w-64 text-sm font-semibold">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between w-64 text-sm items-center">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                  <input type="checkbox" checked={applyGst} onChange={e => setApplyGst(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700" />
                  Apply 18% GST
                </label>
                <span>₹{gstAmount.toLocaleString()}</span>
              </div>
              <div className="w-64 h-px bg-zinc-200 dark:bg-zinc-700 my-2" />
              <div className="flex justify-between w-64 text-lg font-black">
                <span>Total:</span>
                <span>₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button form="invoiceForm" type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
