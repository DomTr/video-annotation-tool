// src/components/specific/AnnotationComponents/FrameViewer.tsx

import React from 'react';

interface FrameViewerProps {
    frameSrc: string;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    videoContainerRef: React.RefObject<HTMLDivElement>;
}

const FrameViewer: React.FC<FrameViewerProps> = ({
                                                     frameSrc,
                                                     onMouseDown,
                                                     onMouseMove,
                                                     onMouseUp,
                                                     videoContainerRef,
                                                 }) => {
    return (
        <div
            ref={videoContainerRef}
            className="relative overflow-hidden bg-black rounded-lg"
            style={{ height: 'calc(100vh - 200px)' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            <img
                src={frameSrc}
                alt="Frame"
                className="w-full h-full object-contain"
                draggable={false}
            />
        </div>
    );
};

export default FrameViewer;
