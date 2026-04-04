import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScannedReceipt {
  id: string;
  merchant: string;
  category: string;
  amount: string;
  date: string;
  notes: string;
  imageDataUrl: string; // compressed for storage
  amountUnclear: boolean;
  notAReceipt: boolean;
  apiFailed: boolean;
}

const CATEGORIES = ['FUEL', 'TOLL', 'MAINTENANCE', 'PARTS', 'FOOD', 'LODGING', 'OTHER'];

// Compress image: resize to maxPx on longest side, JPEG at quality
async function compressImage(file: File, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Strip data URL prefix to get raw base64
function toBase64(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

async function analyzeReceiptWithOpenAI(base64Image: string): Promise<{
  merchant: string;
  category: string;
  amount: number | null;
  date: string | null;
  notes: string;
}> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY not set in .env');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
          {
            type: 'text',
            text: `Analyze this receipt or invoice for a truck driver.
Return ONLY a valid JSON object, no markdown, no explanation:
{
  "merchant": "name of business or service provider",
  "category": "FUEL or TOLL or MAINTENANCE or PARTS or FOOD or LODGING or OTHER",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "notes": "brief description of what was purchased"
}
Rules:
- category must be exactly one of the listed options
- amount must be a number (the total paid, not subtotal)
- If date is not visible, use null
- If amount is not clear, use null
- merchant should be the business name only, not address`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}

interface ReceiptScannerProps {
  onClose: () => void;
  onConfirm: (receipts: ScannedReceipt[]) => void;
}

const ReceiptScanner = ({ onClose, onConfirm }: ReceiptScannerProps) => {
  const [phase, setPhase] = useState<'select' | 'scanning' | 'review'>('select');
  const [receipts, setReceipts] = useState<ScannedReceipt[]>([]);
  const [scanProgress, setScanProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setPhase('scanning');
    const results: ScannedReceipt[] = [];

    for (let i = 0; i < files.length; i++) {
      setScanProgress(`Processing ${i + 1} of ${files.length} receipt${files.length > 1 ? 's' : ''}...`);
      const file = files[i];
      let imageForStorage = '';
      let scanned: ScannedReceipt;

      try {
        // Compress for API (1024px, 0.80 quality)
        const apiImage = await compressImage(file, 1024, 0.80);
        // Compress for storage (800px, 0.65 quality)
        const storageImage = await compressImage(file, 800, 0.65);
        imageForStorage = storageImage;

        const result = await analyzeReceiptWithOpenAI(toBase64(apiImage));
        const today = new Date().toISOString().split('T')[0];
        const amountUnclear = result.amount === null;
        const category = CATEGORIES.includes(result.category) ? result.category : 'OTHER';
        scanned = {
          id: crypto.randomUUID(),
          merchant: result.merchant || '',
          category,
          amount: result.amount !== null ? String(result.amount) : '',
          date: result.date || today,
          notes: result.notes || '',
          imageDataUrl: storageImage,
          amountUnclear,
          notAReceipt: false,
          apiFailed: false,
        };
      } catch {
        scanned = {
          id: crypto.randomUUID(),
          merchant: '',
          category: 'OTHER',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          imageDataUrl: imageForStorage,
          amountUnclear: false,
          notAReceipt: false,
          apiFailed: true,
        };
      }

      results.push(scanned);
    }

    setReceipts(results);
    setPhase('review');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const updateReceipt = (id: string, field: keyof ScannedReceipt, value: string) => {
    setReceipts(prev =>
      prev.map(r => r.id === id ? { ...r, [field]: value } : r)
    );
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const handleConfirmAll = () => {
    onConfirm(receipts.filter(r => r.amount !== ''));
  };

  if (phase === 'select') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="brutal-border bg-card w-full max-w-sm brutal-shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="brutal-text text-xl font-bold">SCAN RECEIPT</h2>
              <p className="brutal-mono text-xs text-muted-foreground">AI-POWERED</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="brutal-border">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Button
            className="w-full h-14 brutal-border bg-primary text-primary-foreground brutal-shadow brutal-hover"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-5 h-5 mr-3" />
            <span className="brutal-text text-base">TAKE PHOTO</span>
          </Button>

          <Button
            className="w-full h-14 brutal-border bg-accent text-accent-foreground brutal-shadow brutal-hover"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 mr-3" />
            <span className="brutal-text text-base">UPLOAD FILES</span>
          </Button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>
    );
  }

  if (phase === 'scanning') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="brutal-border bg-card w-full max-w-sm brutal-shadow-lg p-8 text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="brutal-text text-lg font-bold">AI IS READING YOUR RECEIPTS...</p>
          <p className="brutal-mono text-sm text-muted-foreground">{scanProgress}</p>
        </div>
      </div>
    );
  }

  // Review phase
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="brutal-border bg-card w-full max-w-lg brutal-shadow-lg flex flex-col max-h-[90vh]">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="brutal-text text-lg font-bold">REVIEW RECEIPTS</h2>
            <p className="brutal-mono text-xs text-muted-foreground">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} scanned</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="brutal-border">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {receipts.map((r) => (
            <div key={r.id} className="brutal-border bg-background p-4 brutal-shadow space-y-3">
              <div className="flex gap-3">
                {r.imageDataUrl && (
                  <img
                    src={r.imageDataUrl}
                    alt="Receipt"
                    className="w-16 h-16 object-cover brutal-border flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {r.apiFailed && (
                    <div className="flex items-center gap-1 text-destructive brutal-mono text-xs mb-2">
                      <AlertCircle className="w-3 h-3" />
                      AI couldn't read this receipt — enter details manually
                    </div>
                  )}
                  {r.notAReceipt && (
                    <div className="flex items-center gap-1 text-warning brutal-mono text-xs mb-2">
                      <AlertCircle className="w-3 h-3" />
                      This may not be a receipt — please verify details
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeReceipt(r.id)}
                  className="flex-shrink-0 text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="brutal-mono text-xs text-muted-foreground block mb-1">MERCHANT</label>
                  <Input
                    value={r.merchant}
                    onChange={e => updateReceipt(r.id, 'merchant', e.target.value)}
                    placeholder="Business name"
                    className="brutal-border h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="brutal-mono text-xs text-muted-foreground block mb-1">CATEGORY</label>
                  <Select value={r.category} onValueChange={v => updateReceipt(r.id, 'category', v)}>
                    <SelectTrigger className="brutal-border h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="brutal-mono text-xs text-muted-foreground block mb-1">AMOUNT ($)</label>
                  <Input
                    value={r.amount}
                    onChange={e => updateReceipt(r.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    className={`brutal-border h-8 text-sm ${r.amountUnclear && !r.amount ? 'border-destructive' : ''}`}
                  />
                  {r.amountUnclear && !r.amount && (
                    <p className="brutal-mono text-xs text-destructive mt-0.5">Amount unclear — enter manually</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="brutal-mono text-xs text-muted-foreground block mb-1">DATE</label>
                  <Input
                    value={r.date}
                    onChange={e => updateReceipt(r.id, 'date', e.target.value)}
                    type="date"
                    className="brutal-border h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          {receipts.length === 0 && (
            <p className="brutal-mono text-sm text-muted-foreground text-center py-4">
              All receipts removed
            </p>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <Button
            className="w-full h-12 brutal-border bg-primary text-primary-foreground brutal-shadow brutal-hover"
            onClick={handleConfirmAll}
            disabled={receipts.length === 0 || receipts.every(r => !r.amount)}
          >
            <Check className="w-5 h-5 mr-2" />
            <span className="brutal-text">CONFIRM ALL ({receipts.filter(r => r.amount !== '').length})</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;
