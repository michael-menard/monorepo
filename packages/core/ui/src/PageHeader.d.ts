import React from 'react';
export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    avatarUrl?: string;
    avatarFallback?: string;
    badges?: Array<{
        label: string;
        variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    }>;
    onBack?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onAdd?: () => void;
    showBackButton?: boolean;
    showEditButton?: boolean;
    showDeleteButton?: boolean;
    showAddButton?: boolean;
    className?: string;
}
export declare const PageHeader: React.FC<PageHeaderProps>;
//# sourceMappingURL=PageHeader.d.ts.map