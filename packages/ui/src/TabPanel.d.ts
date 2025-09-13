import React from 'react';
export interface TabItem {
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
}
export interface TabPanelProps {
    tabs: Array<TabItem>;
    defaultTab?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    tabsListClassName?: string;
    tabsContentClassName?: string;
}
export declare const TabPanel: React.FC<TabPanelProps>;
//# sourceMappingURL=TabPanel.d.ts.map