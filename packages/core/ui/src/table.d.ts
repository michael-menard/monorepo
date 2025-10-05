import * as React from "react";
export interface TableProps extends React.ComponentProps<"table"> {
    caption?: string;
    summary?: string;
    role?: string;
}
declare function Table({ className, caption, summary, role, ...props }: TableProps): import("react/jsx-runtime").JSX.Element;
declare function TableHeader({ className, ...props }: React.ComponentProps<"thead">): import("react/jsx-runtime").JSX.Element;
declare function TableBody({ className, ...props }: React.ComponentProps<"tbody">): import("react/jsx-runtime").JSX.Element;
declare function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">): import("react/jsx-runtime").JSX.Element;
declare function TableRow({ className, selected, ...props }: React.ComponentProps<"tr"> & {
    selected?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function TableHead({ className, sort, ...props }: React.ComponentProps<"th"> & {
    sort?: 'ascending' | 'descending' | 'none' | 'other';
}): import("react/jsx-runtime").JSX.Element;
declare function TableCell({ className, ...props }: React.ComponentProps<"td">): import("react/jsx-runtime").JSX.Element;
declare function TableCaption({ className, ...props }: React.ComponentProps<"caption">): import("react/jsx-runtime").JSX.Element;
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption, };
//# sourceMappingURL=table.d.ts.map