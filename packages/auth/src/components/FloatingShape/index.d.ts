interface FloatingShapeProps {
    color: string;
    size: string;
    top: string;
    left: string;
    delay: number;
    speed?: 'slow' | 'medium' | 'fast';
}
declare const FloatingShape: ({ color, size, top, left, delay, speed }: FloatingShapeProps) => import("react/jsx-runtime").JSX.Element;
export default FloatingShape;
