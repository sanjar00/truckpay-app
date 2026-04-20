import { Button } from '@/components/ui/button';
import { DeleteConfirmation } from '@/types/LoadReports';

interface ConfirmationDialogProps {
  showDeleteConfirm: DeleteConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog = ({ showDeleteConfirm, onConfirm, onCancel }: ConfirmationDialogProps) => {
  if (!showDeleteConfirm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="brutal-border bg-card p-6 brutal-shadow-lg max-w-md w-full mx-4">
        <h3 className="brutal-text text-xl text-foreground mb-4">
          CONFIRM DELETE
        </h3>
        <p className="brutal-mono text-sm text-muted-foreground mb-6">
          {showDeleteConfirm.type === 'load' 
            ? 'Are you sure you want to delete this load?' 
            : 'Are you sure you want to delete this deduction?'
          }
        </p>
        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1 brutal-border-destructive"
          >
            DELETE
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 brutal-border"
          >
            CANCEL
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;