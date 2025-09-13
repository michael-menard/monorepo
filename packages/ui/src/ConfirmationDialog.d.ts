import React from 'react';
export interface ConfirmationDialogProps {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onConfirm: () => void;
    onCancel?: () => void;
}
export declare const ConfirmationDialog: React.FC<ConfirmationDialogProps>;
//# sourceMappingURL=ConfirmationDialog.d.ts.map