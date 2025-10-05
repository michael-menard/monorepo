export declare const KEYBOARD_KEYS: {
    readonly ENTER: "Enter";
    readonly SPACE: " ";
    readonly ESCAPE: "Escape";
    readonly TAB: "Tab";
    readonly ARROW_UP: "ArrowUp";
    readonly ARROW_DOWN: "ArrowDown";
    readonly ARROW_LEFT: "ArrowLeft";
    readonly ARROW_RIGHT: "ArrowRight";
    readonly HOME: "Home";
    readonly END: "End";
    readonly PAGE_UP: "PageUp";
    readonly PAGE_DOWN: "PageDown";
};
export declare const KEYBOARD_SHORTCUTS: {
    readonly NEXT_ITEM: readonly ["ArrowDown", "ArrowRight"];
    readonly PREV_ITEM: readonly ["ArrowUp", "ArrowLeft"];
    readonly FIRST_ITEM: readonly ["Home"];
    readonly LAST_ITEM: readonly ["End"];
    readonly SELECT_ITEM: readonly ["Enter", " "];
    readonly CLOSE: readonly ["Escape"];
    readonly TOGGLE: readonly ["Enter", " "];
};
export declare const getAriaAttributes: (options: {
    expanded?: boolean;
    selected?: boolean;
    disabled?: boolean;
    pressed?: boolean;
    current?: boolean;
    describedBy?: string;
    controls?: string;
    owns?: string;
    label?: string;
    labelledBy?: string;
    hidden?: boolean;
    live?: "polite" | "assertive" | "off";
    atomic?: boolean;
    relevant?: "additions" | "removals" | "text" | "all";
    busy?: boolean;
    invalid?: boolean;
    required?: boolean;
    hasPopup?: boolean;
    popup?: "true" | "false" | "menu" | "listbox" | "tree" | "grid" | "dialog";
    sort?: "ascending" | "descending" | "none" | "other";
    valueNow?: number;
    valueMin?: number;
    valueMax?: number;
    valueText?: string;
    orientation?: "horizontal" | "vertical";
    autocomplete?: "inline" | "list" | "both" | "none";
    multiselectable?: boolean;
    readOnly?: boolean;
    placeholder?: string;
}) => Record<string, string | number | boolean>;
export declare const useFocusTrap: (isActive?: boolean) => {
    containerRef: import("react").RefObject<HTMLElement | null>;
    focusFirstElement: () => void;
    focusLastElement: () => void;
    focusNextElement: () => void;
    focusPreviousElement: () => void;
    getFocusableElements: () => HTMLElement[];
};
export declare const createKeyboardHandler: (handlers: Record<string, (event: KeyboardEvent) => void>) => (event: KeyboardEvent) => void;
export declare const useFocusRestoration: () => {
    saveFocus: () => void;
    restoreFocus: () => void;
};
export declare const useLiveRegion: () => {
    announce: (message: string, priority?: "polite" | "assertive") => void;
    announceBusy: (isBusy: boolean) => void;
};
export declare const useKeyboardNavigationContext: () => {
    registerShortcut: (key: string, handler: () => void) => void;
    unregisterShortcut: (key: string) => void;
};
export declare const useUniqueId: (prefix?: string) => string;
export declare const isFocusable: (element: HTMLElement) => boolean;
export declare const getNextFocusableElement: (currentElement: HTMLElement, direction?: "forward" | "backward") => HTMLElement | null;
export declare const announceToScreenReader: (message: string, priority?: "polite" | "assertive") => void;
//# sourceMappingURL=keyboard-navigation.d.ts.map