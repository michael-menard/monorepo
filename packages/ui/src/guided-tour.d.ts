import React, { ReactNode } from 'react';
interface TourStepConfig {
    id: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    order: number;
}
interface TourProviderProps {
    children: ReactNode;
    autoStart?: boolean;
    ranOnce?: boolean;
    storageKey?: string;
    shouldStart?: boolean;
    onTourComplete?: () => void;
    onTourSkip?: () => void;
}
interface TourContextType {
    registerStep: (stepConfig: TourStepConfig, element: HTMLElement) => void;
    unregisterStep: (id: string) => void;
    startTour: () => void;
    stopTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    resetTourCompletion: () => void;
    isActive: boolean;
    currentStepId: string | null;
    currentStepIndex: number;
    totalSteps: number;
}
export declare const useTour: () => TourContextType;
export declare const TourProvider: React.FC<TourProviderProps>;
export declare const TourStep: React.FC<{
    id: string;
    title: string;
    content: string;
    order: number;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children: ReactNode;
}>;
export declare const TourTrigger: React.FC<{
    children: ReactNode;
    className?: string;
    hideAfterComplete?: boolean;
    storageKey?: string;
}>;
export default TourProvider;
//# sourceMappingURL=guided-tour.d.ts.map