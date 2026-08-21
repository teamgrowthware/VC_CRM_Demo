'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, FileText, IndianRupee, Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { DateInput } from '@/components/ui/DateInput';
import { getAllProjects } from '@/lib/api/project';
import { Project } from '@/types/project';
import { createInvoice } from '@/lib/api/invoice';
import { format } from 'date-fns';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  
  const [formData, setFormData] = useState({
    clientName: '',
    projectId: '',
    dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    notes: '',
  });

  const [items, setItems] = useState([{ description: '', hours: '', rate: '', total: 0 }]);
  const [applyGst, setApplyGst] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          setFetchingProjects(true);
          const projs = await getAllProjects();
          setProjects(projs);
        } catch (error) {
          toast.error('Failed to load projects');
        } finally {
          setFetchingProjects(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto calculate total for item
    if (field === 'hours' || field === 'rate') {
      const hrs = parseFloat(newItems[index].hours || '0');
      const rate = parseFloat(newItems[index].rate || '0');
      newItems[index].total = hrs > 0 && rate > 0 ? hrs * rate : parseFloat(value || '0');
    }
    
    if (field === 'total') {
      newItems[index].total = parseFloat(value || '0');
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', hours: '', rate: '', total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const subTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const gstAmount = applyGst ? subTotal * 0.18 : 0;
  const grandTotal = subTotal + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.clientName) {
      toast.error('Client Name and Project are required');
      return;
    }
    
    if (items.some(i => !i.description || i.total <= 0)) {
      toast.error('All items must have a description and a valid total > 0');
      return;
    }

    try {
      setLoading(true);
      
      const finalItems = [...items];
      if (applyGst && gstAmount > 0) {
        finalItems.push({
          description: 'GST (18%)',
          hours: '',
          rate: '',
          total: gstAmount
        });
      }

      const payload = {
        ...formData,
        amount: grandTotal,
        items: finalItems.map(i => ({
          description: i.description,
          hours: i.hours ? parseFloat(i.hours) : null,
          rate: i.rate ? parseFloat(i.rate) : null,
          total: i.total
        }))
      };

      await createInvoice(payload);
      toast.success('Invoice generated successfully');
      onSuccess();
      onClose();
      
      // Reset
      setFormData({
        clientName: '',
        projectId: '',
        dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        notes: '',
      });
      setItems([{ description: '', hours: '', rate: '', total: 0 }]);
      setApplyGst(false);
    } catch (thrown) { const error = thrown as ApiError;
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Create Invoice</h2>
              <p className="text-xs text-zinc-500 font-medium">Generate a new GST billing invoice</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors group">
            <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Client / Company Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Acme Corp"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Related Project</label>
              <select
                required
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-medium appearance-none"
              >
                <option value="">Select a project</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Due Date</label>
            <DateInput
              value={formData.dueDate}
              onChange={(val) => setFormData({ ...formData, dueDate: val })}
              required={true}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Invoice Items</label>
            </div>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start animate-in fade-in duration-200">
                  <input
                    required
                    type="text"
                    placeholder="Description (e.g. Web Development)"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="flex-[2] px-3 py-2 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Hrs/Qty"
                    value={item.hours}
                    onChange={(e) => handleItemChange(idx, 'hours', e.target.value)}
                    className="w-20 px-3 py-2 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm text-center"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    className="w-24 px-3 py-2 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm text-center"
                  />
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      required
                      type="number"
                      placeholder="Total"
                      value={item.total || ''}
                      onChange={(e) => handleItemChange(idx, 'total', e.target.value)}
                      className="w-32 pl-8 pr-3 py-2 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button 
                type="button" 
                onClick={addItem}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors ml-1"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
             <label className="flex items-center gap-2 cursor-pointer ml-1 w-fit group">
                <div className="relative flex items-center">
                   <input type="checkbox" className="sr-only" checked={applyGst} onChange={(e) => setApplyGst(e.target.checked)} />
                   <div className={`w-10 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full transition-colors ${applyGst ? 'bg-emerald-500' : ''}`}></div>
                   <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${applyGst ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Apply 18% GST</span>
             </label>

             <div className="bg-zinc-50 dark:bg-black/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-sm text-zinc-500">
                   <span>Subtotal:</span>
                   <span className="font-medium flex items-center"><IndianRupee className="w-3 h-3 mr-0.5" />{subTotal.toFixed(2)}</span>
                </div>
                {applyGst && (
                   <div className="flex justify-between text-sm text-zinc-500">
                      <span>GST (18%):</span>
                      <span className="font-medium flex items-center"><IndianRupee className="w-3 h-3 mr-0.5" />{gstAmount.toFixed(2)}</span>
                   </div>
                )}
                <div className="flex justify-between text-lg font-black text-zinc-900 dark:text-white pt-2 border-t border-zinc-200 dark:border-zinc-800">
                   <span>Grand Total:</span>
                   <span className="flex items-center text-emerald-600 dark:text-emerald-400"><IndianRupee className="w-5 h-5 mr-0.5" />{grandTotal.toFixed(2)}</span>
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Notes / Terms (Optional)</label>
            <textarea
              placeholder="Payment terms, bank details, etc..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-medium min-h-[80px] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 shrink-0 border-t border-zinc-200 dark:border-zinc-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetchingProjects}
              className="flex-2 py-3 px-8 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-extrabold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/10 dark:shadow-white/5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
