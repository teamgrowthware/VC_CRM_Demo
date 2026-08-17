'use client';

import { useEffect, useState } from 'react';
import { Loader2, Receipt, IndianRupee, Clock, CheckCircle2, AlertTriangle, Calendar, CreditCard, Smartphone, Banknote, X, ChevronRight } from 'lucide-react';
import { getMyInvoices, approveInvoice, payInvoice, ClientInvoice } from '@/lib/api/client';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock },
  SENT: { label: 'Sent', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: ChevronRight },
  APPROVED: { label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  PAID: { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  OVERDUE: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', color: 'text-muted-foreground', bg: 'bg-muted', icon: X },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  return `${diff}d left`;
}

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [payModal, setPayModal] = useState<{ open: boolean; invoice: ClientInvoice | null }>({ open: false, invoice: null });
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadInvoices = async () => {
    try {
      const data = await getMyInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoices(); }, []);

  const handleApprove = async (invoiceId: string) => {
    if (!confirm('Approve this invoice?')) return;
    try {
      await approveInvoice(invoiceId);
      toast.success('Invoice approved');
      await loadInvoices();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const handlePay = async () => {
    if (!payModal.invoice) return;
    setProcessing(true);
    try {
      await payInvoice(payModal.invoice.id, { paymentMode, transactionId: transactionId || undefined });
      toast.success('Payment recorded successfully');
      setPayModal({ open: false, invoice: null });
      setTransactionId('');
      await loadInvoices();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const totalPending = invoices.filter(i => ['SENT', 'APPROVED', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          Invoices
        </h1>
        <p className="text-sm text-muted-foreground mt-1">View, approve, and pay your invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pending</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(totalPending)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</div>
        </div>
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Receipt className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No invoices yet</h3>
          <p className="text-sm text-muted-foreground">Invoices from your projects will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const cfg = statusConfig[inv.status] || statusConfig.DRAFT;
            const Icon = cfg.icon;
            const overdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && new Date(inv.dueDate) < new Date();
            return (
              <div key={inv.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Status indicator */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-6 h-6 ${overdue ? 'text-red-500' : cfg.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{inv.project.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {overdue && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {daysUntil(inv.dueDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {formatDate(inv.dueDate)}
                      </span>
                      {inv.paidAt && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid: {formatDate(inv.paidAt)}
                        </span>
                      )}
                      {inv.items.length > 0 && (
                        <span>{inv.items.length} item{inv.items.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Amount + Actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">{formatCurrency(inv.amount)}</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {inv.status === 'SENT' && (
                        <button
                          onClick={() => handleApprove(inv.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {['SENT', 'APPROVED', 'OVERDUE'].includes(inv.status) && (
                        <button
                          onClick={() => setPayModal({ open: true, invoice: inv })}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl transition-colors"
                        >
                          Pay Now
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedInvoice(selectedInvoice?.id === inv.id ? null : inv)}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold rounded-xl transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedInvoice?.id === inv.id && (
                  <div className="border-t border-border p-5 bg-muted/30">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Invoice Items</h4>
                    {inv.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No line items</p>
                    ) : (
                      <div className="space-y-2">
                        {inv.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{item.description}</span>
                            <span className="font-medium text-foreground">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-border">
                          <span className="text-foreground">Total</span>
                          <span className="text-foreground">{formatCurrency(inv.amount)}</span>
                        </div>
                      </div>
                    )}
                    {inv.notes && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <span className="font-semibold">Notes:</span> {inv.notes}
                      </div>
                    )}
                    {inv.paymentMode && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold">Payment Mode:</span> {inv.paymentMode}
                        {inv.transactionId && <span> • TXN: {inv.transactionId}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Modal */}
      {payModal.open && payModal.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setPayModal({ open: false, invoice: null })}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Record Payment</h2>
              <button onClick={() => setPayModal({ open: false, invoice: null })} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted rounded-xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Amount Due</div>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(payModal.invoice.amount)}</div>
                <div className="text-xs text-muted-foreground mt-1">{payModal.invoice.project.name}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BANK_TRANSFER', label: 'Bank', icon: CreditCard },
                    { id: 'UPI', label: 'UPI', icon: Smartphone },
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                  ].map(m => (
                    <button key={m.id} onClick={() => setPaymentMode(m.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        paymentMode === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-border/80 text-muted-foreground'
                      }`}>
                      <m.icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Transaction ID <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground"
                  placeholder="UTR / Reference number" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setPayModal({ open: false, invoice: null })} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handlePay} disabled={processing}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
