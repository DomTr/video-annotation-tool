// src/components/AnnotationOverlay.tsx

import React from 'react';
import { X, Edit } from 'lucide-react';

interface Polyp {
    id: number;
    frame: number;
    notes: string;
    startFrame: number;
    endFrame: number | null;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

interface AnnotationOverlayProps {
    polyps: Polyp[];
    selectedPolyp: number | null;
    onSelectPolyp: (id: number) => void;
    onDrag: (e: React.MouseEvent<HTMLDivElement>, id: number) => void;
    onResize: (e: React.MouseEvent<HTMLDivElement>, id: number) => void;
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
                                                                 polyps,
                                                                 selectedPolyp,
                                                                 onSelectPolyp,
                                                                 onDrag,
                                                                 onResize,
                                                             }) => {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {polyps.map(polyp => (
                <div
                    key={polyp.id}
                    data-type="polyp"
                    className={`absolute border-2 ${
                        selectedPolyp === polyp.id ? 'border-red-500' : 'border-blue-500'
                    } ${selectedPolyp === polyp.id ? 'bg-blue-300 bg-opacity-30' : 'bg-blue-200 bg-opacity-20'} cursor-move`}
                    style={{
                        left: `${polyp.position.x}px`,
                        top: `${polyp.position.y}px`,
                        width: `${polyp.size.width}px`,
                        height: `${polyp.size.height}px`,
                        zIndex: selectedPolyp === polyp.id ? 20 : 10,
                        pointerEvents: 'all',
                    }}
                    onMouseDown={(e) => onDrag(e, polyp.id)}
                    onClick={() => onSelectPolyp(polyp.id)}
                >
                    <div
                        className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
                        onMouseDown={(e) => onResize(e, polyp.id)}
                    />
                    <div className="absolute top-0 left-0 text-xs text-white bg-blue-500 px-1">
                        #{polyp.id}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AnnotationOverlay;
