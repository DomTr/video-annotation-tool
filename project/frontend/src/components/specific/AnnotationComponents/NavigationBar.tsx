// src/components/NavigationBar.tsx

import React from 'react';
import { Edit, X } from 'lucide-react';

interface NavigationBarProps {
    isFrameAnnotationMode: boolean;
    onEnterFrameMode: () => void;
    onExitFrameMode: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
                                                         isFrameAnnotationMode,
                                                         onEnterFrameMode,
                                                         onExitFrameMode,
                                                     }) => {
    return (
        <div className="bg-white shadow-sm p-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-600">Video Annotator</h1>
            <div className="flex items-center">
                {!isFrameAnnotationMode ? (
                    <button
                        onClick={onEnterFrameMode}
                        className="ml-4 flex items-center bg-blue-500 text-white px-3 py-1 rounded"
                    >
                        <Edit className="w-5 h-5 mr-2" />
                        <span>Annotate Frames</span>
                    </button>
                ) : (
                    <button
                        onClick={onExitFrameMode}
                        className="ml-4 flex items-center bg-gray-500 text-white px-3 py-1 rounded"
                    >
                        <X className="w-5 h-5 mr-2" />
                        <span>Exit Frame Mode</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default NavigationBar;
