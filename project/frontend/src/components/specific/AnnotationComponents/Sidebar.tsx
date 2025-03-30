// src/components/Sidebar.tsx

import React from 'react';
import { Square, Edit, X } from 'lucide-react';

interface Polyp {
    id: number;
    frame: number;
    notes: string;
    startFrame: number;
    endFrame: number | null;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

interface SidebarProps {
    polyps: Polyp[];
    selectedPolyp: number | null;
    onSelectPolyp: (id: number) => void;
    onEndPolyp: (id: number) => void;
    onAddNote: (id: number) => void;
    onDeletePolyp: (id: number) => void;
    isFrameAnnotationMode: boolean;
    currentFrameId: number | null;
}

const Sidebar: React.FC<SidebarProps> = ({
                                             polyps,
                                             selectedPolyp,
                                             onSelectPolyp,
                                             onEndPolyp,
                                             onAddNote,
                                             onDeletePolyp,
                                             isFrameAnnotationMode,
                                             currentFrameId,
                                         }) => {
    const filteredPolyps = isFrameAnnotationMode
        ? polyps.filter(polyp => polyp.frame === currentFrameId)
        : polyps.filter(polyp => polyp.frame === null || polyp.frame === undefined);

    return (
        <div className="w-80 bg-white rounded-lg shadow p-4 flex flex-col">
            <div className="text-center p-2 bg-gray-100 rounded mb-4">
                <p className="text-sm text-gray-500">
                    Current {isFrameAnnotationMode ? 'Frame' : 'Video Mode'}
                </p>
                <p className="text-xl font-bold">
                    {isFrameAnnotationMode ? `${currentFrameId}` : 'Video Mode'}
                </p>
            </div>

            <div className="flex-1 overflow-auto">
                <h3 className="text-sm font-medium mb-2">Current Annotations</h3>
                <div className="space-y-2">
                    {filteredPolyps.map(polyp => (
                        <div
                            key={polyp.id}
                            className={`bg-gray-50 p-3 rounded cursor-pointer ${
                                selectedPolyp === polyp.id ? 'border-2 border-red-500' : ''
                            }`}
                            onClick={() => onSelectPolyp(polyp.id)}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Square className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium">
                                    Annotation #{polyp.id}
                                </span>
                            </div>
                            {isFrameAnnotationMode && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onEndPolyp(polyp.id)}
                                        className="px-2 py-1 text-sm border rounded"
                                    >
                                        End
                                    </button>
                                    <button
                                        onClick={() => onAddNote(polyp.id)}
                                        className="px-2 py-1 text-sm border rounded"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => onDeletePolyp(polyp.id)}
                                        className="px-2 py-1 text-sm border rounded text-red-500"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
