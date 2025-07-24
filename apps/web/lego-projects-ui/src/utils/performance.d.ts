export declare const performanceUtils: {
    trackRender: (componentName: string) => () => void;
    debounce: (func: Function, wait: number) => (...args: any[]) => void;
    throttle: (func: Function, limit: number) => (...args: any[]) => void;
    memoize: (func: Function) => (...args: any[]) => any;
    measure: (func: Function, name: string) => (...args: any[]) => any;
};
export declare const usePerformanceTracking: (componentName: string) => void;
