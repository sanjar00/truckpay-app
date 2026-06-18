import { Fuel, X } from 'lucide-react';
import { CandidateLoad, FuelReceipt, loadLabel } from '@/lib/fuelRouting';

interface FuelLoadPickerModalProps {
  receipt: FuelReceipt;
  candidates: CandidateLoad[];
  onPick: (load: CandidateLoad) => void;
  /** Skip routing to IFTA — the fuel is still logged as a weekly expense. */
  onSkip: () => void;
}

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const FuelLoadPickerModal = ({ receipt, candidates, onPick, onSkip }: FuelLoadPickerModalProps) => {
  const summaryBits = [
    receipt.amount ? `$${parseFloat(receipt.amount).toFixed(2)}` : null,
    receipt.gallons ? `${receipt.gallons} gal` : null,
    receipt.state || null,
    receipt.date ? fmtDate(receipt.date) : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm brutal-border bg-card brutal-shadow-xl flex flex-col" style={{ borderRadius: '8px', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1a1a2e', color: '#f0a500' }}>
          <Fuel className="w-4 h-4" />
          <span className="brutal-text text-sm font-bold uppercase tracking-wide flex-1">Match Fuel to a Load</span>
          <button onClick={onSkip} className="hover:opacity-80" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {/* Receipt summary */}
          <div className="brutal-border p-2 mb-3" style={{ background: '#e8f5e9' }}>
            <p className="brutal-mono text-[11px] font-bold" style={{ color: '#1a1a2e' }}>FUEL RECEIPT</p>
            <p className="brutal-mono text-sm" style={{ color: '#1a1a2e' }}>{summaryBits.join(' · ') || '—'}</p>
            {receipt.merchant && <p className="brutal-mono text-[11px] text-muted-foreground">{receipt.merchant}</p>}
          </div>

          <p className="brutal-mono text-xs text-muted-foreground mb-2">
            {candidates.length > 0
              ? 'Which load was this fuel for? It will be added to that load’s IFTA report.'
              : 'No matching load found near this date.'}
          </p>

          {/* Candidate loads */}
          <div className="space-y-2">
            {candidates.map((load) => (
              <button
                key={load.id}
                onClick={() => onPick(load)}
                className="w-full brutal-border p-3 text-left brutal-shadow brutal-hover"
                style={{ background: '#ffffff' }}
              >
                <p className="brutal-text text-sm" style={{ color: '#1a1a2e' }}>{loadLabel(load)}</p>
                <p className="brutal-mono text-[11px] text-muted-foreground">
                  {fmtDate(load.pickupDate)}{load.deliveryDate ? ` – ${fmtDate(load.deliveryDate)}` : ''}
                  {load.estimatedMiles ? ` · ${load.estimatedMiles} mi` : ''}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Skip */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onSkip}
            className="w-full brutal-mono text-xs text-muted-foreground hover:text-foreground min-h-9"
          >
            Skip — just log it as a truck expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default FuelLoadPickerModal;
