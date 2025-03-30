// src/components/VideoPlayer.tsx

import React, { useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface VideoPlayerProps {
    src: string;
    isPlaying: boolean;
    onPlayPause: () => void;
    onSeekFrame: (direction: number) => void;
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
                                                     src,
                                                     isPlaying,
                                                     onPlayPause,
                                                     onSeekFrame,
                                                     onTimeUpdate,
                                                     onLoadedMetadata,
                                                 }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying]);

    return (
        <div className="relative overflow-hidden bg-black rounded-lg" style={{ height: 'calc(100vh - 200px)' }}>
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                src={src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                controls={false}
                autoPlay={false}
                muted
            />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => onSeekFrame(-1)} className="p-2">
                        <SkipBack className="w-6 h-6" />
                    </button>
                    <button onClick={onPlayPause} className="p-2">
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    <button onClick={() => onSeekFrame(1)} className="p-2">
                        <SkipForward className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
