// src/pages/VideoAnnotationPage.tsx

import React, { useState, useRef, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from "../context/AuthContext";
import {
    createOrUpdateAnnotation,
    fetchAnnotationsForFrame,
    deleteAnnotation
} from '../services/annotationService';

import NavigationBar from '../components/specific/AnnotationComponents/NavigationBar';
import VideoPlayer from '../components/specific/AnnotationComponents/VideoPlayer';
import FrameViewer from '../components/specific/AnnotationComponents/FrameViewer';
import AnnotationOverlay from '../components/specific/AnnotationComponents/AnnotationOverlay';
import Sidebar from '../components/specific/AnnotationComponents/Sidebar';
import { SkipBack, SkipForward } from "lucide-react";

/**
 * Represents a polyp annotation on a video frame.
 */
interface Polyp {
    /** Unique identifier for the polyp */
    id: number;
    /** Frame number where the polyp is located */
    frame: number;
    /** Notes associated with the polyp */
    notes: string;
    /** Starting frame number for the polyp annotation */
    startFrame: number;
    /** Ending frame number for the polyp annotation (nullable) */
    endFrame: number | null;
    /** X and Y coordinates of the polyp's position */
    position: { x: number; y: number };
    /** Width and height of the polyp's bounding box */
    size: { width: number; height: number };
}

/**
 * Represents metadata information about a video.
 */
interface VideoMetadata {
    /** Unique identifier for the video */
    id: number;
    /** Title of the video */
    title: string;
    /** Description of the video */
    description: string;
    /** File path where the video is stored */
    file_path: string;
    /** Timestamp when the video was uploaded */
    upload_time: string;
    /** Identifier of the user who uploaded the video (nullable) */
    user_id: number | null;
    /** Indicates whether frames have been loaded for annotation */
    frames_loaded: boolean;
    /** Duration of the video (can be string or number) */
    duration: string | number;
}

/**
 * Represents information about a single video frame.
 */
interface FrameInfo {
    /** Unique identifier for the frame */
    id: number;
    /** Path to the frame image */
    path: string;
}

const localhost = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * Parses the duration of a video from a string or number format into seconds.
 *
 * @param {string | number} duration - The duration to parse, either as a string (e.g., "01:30:00") or number of seconds.
 * @returns {number} - The duration in seconds.
 */
const parseDuration = (duration: string | number): number => {
    if (typeof duration === 'string') {
        const parts = duration.split(':').map(part => parseInt(part, 10));
        if (parts.length === 3) {
            // Format: HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            // Format: MM:SS
            return parts[0] * 60 + parts[1];
        } else {
            // Unexpected format, attempt to parse as integer
            return parseInt(duration, 10) || 0;
        }
    } else if (typeof duration === 'number') {
        // Assume duration is already in seconds
        return duration;
    } else {
        // Fallback for unexpected types
        return 0;
    }
};

/**
 * VideoAnnotationPage component handles the annotation process for a specific video.
 *
 * @component
 */
const VideoAnnotationPage: React.FC = () => {
    // Extract video ID from URL parameters
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const { authToken } = useContext(AuthContext);

    // State variables for managing various aspects of the annotation process
    const [frames, setFrames] = useState<FrameInfo[]>([]); // List of frames extracted from the video
    const [polyps, setPolyps] = useState<Polyp[]>([]); // List of polyp annotations
    const [isPlaying, setIsPlaying] = useState<boolean>(false); // Playback state of the video
    const [selectedPolyp, setSelectedPolyp] = useState<number | null>(null); // Currently selected polyp for editing or deletion
    const [isResizing, setIsResizing] = useState<boolean>(false); // Indicates if a polyp is being resized
    const [isDragging, setIsDragging] = useState<boolean>(false); // Indicates if a polyp is being dragged
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // Starting coordinates for dragging
    const [isDrawing, setIsDrawing] = useState<boolean>(false); // Indicates if the user is drawing a new polyp
    const [drawingStart, setDrawingStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // Starting coordinates for drawing
    const [currentDrawing, setCurrentDrawing] = useState<{ x: number; y: number; width: number; height: number } | null>(null); // Current drawing rectangle
    const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null); // Metadata of the current video
    const [loading, setLoading] = useState<boolean>(true); // Loading state for fetching video data
    const [error, setError] = useState<string>(''); // Error message state
    const [isUploading, setIsUploading] = useState<boolean>(false); // Indicates if a video is being uploaded
    const [uploadProgress, setUploadProgress] = useState<number>(0); // Upload progress percentage
    const [uploadedVideoURL, setUploadedVideoURL] = useState<string | null>(null); // URL of the uploaded video
    const [cropStart, setCropStart] = useState<number>(0); // Start time for cropping the video
    const [cropEnd, setCropEnd] = useState<number>(0); // End time for cropping the video
    const [videoDuration, setVideoDuration] = useState<number>(0); // Total duration of the video
    const [isFrameAnnotationMode, setIsFrameAnnotationMode] = useState<boolean>(false); // Indicates if the user is annotating frames
    const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0); // Index of the currently displayed frame
    const [saving, setSaving] = useState<boolean>(false); // Indicates if annotations are being saved

    // References to DOM elements
    const videoRef = useRef<HTMLVideoElement>(null); // Reference to the video player element
    const videoContainerRef = useRef<HTMLDivElement>(null); // Reference to the video container element

    // Current frame ID based on the frame index
    const currentFrameId = frames.length > 0 ? frames[currentFrameIndex].id : null;

    /**
     * Fetches metadata for the specified video upon component mount or when the video ID changes.
     *
     * @async
     * @function
     * @returns {Promise<void>}
     */
    useEffect(() => {
        const fetchVideoData = async () => {
            if (!id) {
                setError('Video not found.');
                setLoading(false);
                return;
            }
            try {
                const metadataResponse = await fetch(`${localhost}/videos/${id}/metadata`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!metadataResponse.ok) {
                    const errorData = await metadataResponse.json();
                    throw new Error(errorData.detail || 'Failed to fetch video metadata.');
                }

                const metadata: VideoMetadata = await metadataResponse.json();
                console.log('Received metadata:', metadata); // Debugging

                setVideoMetadata(metadata);
                setUploadedVideoURL(`${localhost}/videos/${id}`);

                // Parse duration from metadata
                const durationSec = metadata.duration ? parseDuration(metadata.duration) : 0;
                setVideoDuration(durationSec);
                setCropEnd(durationSec);
            } catch (err: any) {
                console.error(err);
                setError('Unable to load video. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchVideoData();
        } else {
            setLoading(false);
        }
    }, [id, authToken]);

    /**
     * Loads annotations for the current frame when in frame annotation mode.
     *
     * @async
     * @function
     * @returns {Promise<void>}
     */
    useEffect(() => {
        const loadAnnotations = async () => {
            if (!isFrameAnnotationMode || currentFrameId === null) return;
            if (!authToken) {
                setError('Authentication required to load annotations.');
                return;
            }
            try {
                const annotations = await fetchAnnotationsForFrame(currentFrameId, authToken);
                const mappedPolyps: Polyp[] = annotations.map((annotation: any) => ({
                    id: annotation.polyp_id,
                    frame: currentFrameId,
                    notes: annotation.content || '',
                    startFrame: Math.floor(annotation.start_time * 30),
                    endFrame: annotation.end_time ? Math.floor(annotation.end_time * 30) : null,
                    position: { x: annotation.x1, y: annotation.y1 },
                    size: { width: annotation.width, height: annotation.height },
                }));
                setPolyps(mappedPolyps);
            } catch (err: any) {
                console.error(err);
                setError(`Failed to load annotations: ${err.message}`);
            }
        };
        if (currentFrameId !== null) {
            loadAnnotations();
        }
    }, [currentFrameIndex, isFrameAnnotationMode, authToken, currentFrameId]);

    /**
     * Saves or updates a polyp annotation.
     *
     * @async
     * @function
     * @param {Polyp} polyp - The polyp annotation to save or update.
     * @returns {Promise<void>}
     */
    const saveAnnotation = async (polyp: Polyp) => {
        if (!authToken) {
            setError('Authentication required to save annotations.');
            return;
        }
        setSaving(true);

        // Prepare annotation data for the backend
        const annotationData = {
            video_id: Number(id),
            frame_id: polyp.frame,
            polyp_id: polyp.id,
            label: polyp.notes || 'No Label',
            x1: polyp.position.x,
            y1: polyp.position.y,
            x2: polyp.position.x + polyp.size.width,
            y2: polyp.position.y + polyp.size.height,
            width: polyp.size.width,
            height: polyp.size.height,
            start_time: polyp.startFrame / 30,
            end_time: polyp.endFrame ? polyp.endFrame / 30 : null,
            content: polyp.notes,
        };

        try {
            // Create or update the annotation in the backend
            const savedAnnotation = await createOrUpdateAnnotation(annotationData, authToken);
            console.log('Annotation saved:', savedAnnotation);
        } catch (err: any) {
            console.error(err);
            setError(`Failed to save annotation: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    /**
     * Fetches frame paths for the video and enters frame annotation mode.
     *
     * @async
     * @function
     * @returns {Promise<void>}
     */
    const fetchFrames = async () => {
        try {
            const response = await fetch(`${localhost}/videos/${id}/get_frames_path/rate/30`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch frames.');
            }

            const data: FrameInfo[] = await response.json();
            setFrames(data);
            setCurrentFrameIndex(0);
            setIsFrameAnnotationMode(true);
        } catch (err: any) {
            console.error(err);
            setError('Unable to load frames. Please try again later.');
        }
    };

    /**
     * Toggles the play/pause state of the video.
     *
     * @function
     */
    const togglePlay = () => {
        setIsPlaying(prev => !prev);
    };

    /**
     * Seeks the video or frames forward or backward based on the direction.
     *
     * @function
     * @param {number} direction - The direction to seek (positive for forward, negative for backward).
     */
    const seekFrame = (direction: number) => {
        if (isFrameAnnotationMode) {
            setCurrentFrameIndex(prev => {
                const newIndex = prev + direction;
                return Math.max(0, Math.min(newIndex, frames.length - 1));
            });
        } else {
            if (videoRef.current) {
                const newTime = videoRef.current.currentTime + direction / 30;
                videoRef.current.currentTime = Math.max(cropStart, Math.min(newTime, cropEnd));
            }
        }
    };

    /**
     * Deletes a polyp annotation by its ID.
     *
     * @async
     * @function
     * @param {number} polypId - The unique identifier of the polyp to delete.
     * @returns {Promise<void>}
     */
    const handleDeletePolyp = async (polypId: number) => {
        if (!authToken) {
            setError('Authentication required to delete annotations.');
            return;
        }

        try {
            if (currentFrameId === null) {
                throw new Error('Current frame ID is not available.');
            }
            await deleteAnnotation(currentFrameId, polypId, authToken);
            // Remove the deleted polyp from the frontend state
            setPolyps(prev => prev.filter(polyp => polyp.id !== polypId));
            if (selectedPolyp === polypId) {
                setSelectedPolyp(null);
            }
        } catch (err: any) {
            console.error(err);
            setError(`Failed to delete annotation: ${err.message}`);
        }
    };

    /**
     * Adds a note to a specific polyp annotation.
     *
     * @async
     * @function
     * @param {number} polypId - The unique identifier of the polyp to add a note to.
     * @returns {Promise<void>}
     */
    const handleAddNote = async (polypId: number) => {
        const note = prompt('Add note:');
        if (!note) return;
        // Update the polyp's notes in the frontend state
        setPolyps(prev =>
            prev.map(polyp =>
                polyp.id === polypId ? { ...polyp, notes: note } : polyp
            )
        );

        // Find the updated polyp and save the annotation
        const updatedPolyp = polyps.find(p => p.id === polypId);
        if (updatedPolyp) {
            await saveAnnotation(updatedPolyp);
        }
    };

    /**
     * Ends a polyp annotation by setting its end frame.
     *
     * @function
     * @param {number} polypId - The unique identifier of the polyp to end.
     */
    const handleEndPolyp = (polypId: number) => {
        if (isFrameAnnotationMode && currentFrameId !== null) {
            // Update the polyp's end frame in the frontend state
            setPolyps(prev =>
                prev.map(polyp =>
                    polyp.id === polypId ? { ...polyp, endFrame: currentFrameIndex + 1 } : polyp
                )
            );
            const updatedPolyp = polyps.find(p => p.id === polypId);
            if (updatedPolyp) {
                saveAnnotation(updatedPolyp);
            }
        }
    };

    /**
     * Initiates dragging of a polyp annotation.
     *
     * @function
     * @param {React.MouseEvent<HTMLDivElement>} e - The mouse event triggered by dragging.
     * @param {number} polypId - The unique identifier of the polyp being dragged.
     */
    const startDrag = (e: React.MouseEvent<HTMLDivElement>, polypId: number) => {
        if (!isFrameAnnotationMode) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setIsResizing(false);
        setSelectedPolyp(polypId);

        const container = videoContainerRef.current?.getBoundingClientRect();
        if (!container) return;

        const polyp = polyps.find(p => p.id === polypId);
        if (!polyp) return;

        setDragStart({
            x: e.clientX - container.left - polyp.position.x,
            y: e.clientY - container.top - polyp.position.y
        });
    };

    /**
     * Handles the dragging movement of a polyp annotation.
     *
     * @function
     * @param {React.MouseEvent<HTMLDivElement>} e - The mouse event during dragging.
     */
    const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || selectedPolyp === null) return;

        const container = videoContainerRef.current?.getBoundingClientRect();
        if (!container) return;

        setPolyps(prev =>
            prev.map(polyp => {
                if (polyp.id === selectedPolyp) {
                    const newX = e.clientX - container.left - dragStart.x;
                    const newY = e.clientY - container.top - dragStart.y;
                    const updatedPolyp = {
                        ...polyp,
                        position: {
                            x: Math.max(0, Math.min(newX, container.width - polyp.size.width)),
                            y: Math.max(0, Math.min(newY, container.height - polyp.size.height))
                        }
                    };
                    // Save the updated annotation
                    saveAnnotation(updatedPolyp);
                    return updatedPolyp;
                }
                return polyp;
            })
        );
    };

    /**
     * Initiates resizing of a polyp annotation.
     *
     * @function
     * @param {React.MouseEvent<HTMLDivElement>} e - The mouse event triggered by resizing.
     * @param {number} polypId - The unique identifier of the polyp being resized.
     */
    const startResize = (e: React.MouseEvent<HTMLDivElement>, polypId: number) => {
        if (!isFrameAnnotationMode) return;
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setIsDragging(false);
        setSelectedPolyp(polypId);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    /**
     * Handles the resizing movement of a polyp annotation.
     *
     * @function
     * @param {React.MouseEvent<HTMLDivElement>} e - The mouse event during resizing.
     */
    const onResize = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isResizing || selectedPolyp === null) return;

        const container = videoContainerRef.current?.getBoundingClientRect();
        if (!container) return;

        const polyp = polyps.find(p => p.id === selectedPolyp);
        if (!polyp) return;

        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        setPolyps(prev =>
            prev.map(p => {
                if (p.id === selectedPolyp) {
                    return {
                        ...p,
                        size: {
                            width: Math.max(30, Math.min(p.size.width + deltaX, container.width - p.position.x)),
                            height: Math.max(30, Math.min(p.size.height + deltaY, container.height - p.position.y))
                        }
                    };
                }
                return p;
            })
        );

        setDragStart({ x: e.clientX, y: e.clientY });
    };

    /**
     * Ends dragging or resizing actions.
     *
     * @function
     */
    const endDragOrResize = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    /**
     * Handles mouse down events for drawing new polyps or initiating dragging/resizing.
     *
     * @function
     * @param {React.MouseEvent<HTMLDivElement>} e - The mouse down event.
     */
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isFrameAnnotationMode) return;
        if ((e.target as HTMLElement).dataset.type !== 'polyp') {
            const container = videoContainerRef.current?.getBoundingClientRect();
            if (!container) return;

            const x = e.clientX - container.left;
            const y = e.clientY - container.top;

            setIsDrawing(true);
            setDrawingStart({ x, y });
            setCurrentDrawing({ x, y, width: 0, height: 0 });
            setSelectedPolyp(null); // Deselect any selected polyp
        }
    };

    /**
     * Handles mouse move events for drawing, dragging, or resizing polyps.
     *
     * @function
     * @param {React.MouseEvent<HTMLDivElement>} e - The mouse move event.
     */
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isFrameAnnotationMode) return;
        if (isDrawing) {
            const container = videoContainerRef.current?.getBoundingClientRect();
            if (!container) return;

            const currentX = e.clientX - container.left;
            const currentY = e.clientY - container.top;

            const width = currentX - drawingStart.x;
            const height = currentY - drawingStart.y;

            setCurrentDrawing({
                x: width < 0 ? currentX : drawingStart.x,
                y: height < 0 ? currentY : drawingStart.y,
                width: Math.abs(width),
                height: Math.abs(height)
            });
        } else if (isResizing) {
            onResize(e);
        } else if (isDragging) {
            onDrag(e);
        }
    };

    /**
     * Handles mouse up events to finalize drawing, dragging, or resizing actions.
     *
     * @function
     */
    const handleMouseUp = () => {
        if (isDrawing && currentDrawing && currentFrameId !== null) {
            // Create a new polyp annotation based on the drawn rectangle
            const newPolyp: Polyp = {
                id: Date.now(), // Generate a unique ID based on timestamp
                frame: currentFrameId, // Associate with the current frame
                notes: '',
                startFrame: currentFrameIndex + 1, // Assuming 1-based frame numbering
                endFrame: null,
                position: { x: currentDrawing.x, y: currentDrawing.y },
                size: { width: currentDrawing.width, height: currentDrawing.height }
            };
            setPolyps(prev => [...prev, newPolyp]);
            setIsDrawing(false);
            setCurrentDrawing(null);
            saveAnnotation(newPolyp);
        } else {
            endDragOrResize();
        }
    };

    /**
     * Handles keyboard events, specifically the 'Delete' key to remove selected polyps.
     *
     * @function
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' && selectedPolyp !== null) {
                handleDeletePolyp(selectedPolyp);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedPolyp, polyps, isFrameAnnotationMode, currentFrameIndex]);

    /**
     * Handles video time updates to manage playback within the cropped range.
     *
     * @function
     */
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        if (videoRef.current.currentTime >= cropEnd) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    /**
     * Handles the event when video metadata is loaded, setting video duration and crop end time.
     *
     * @function
     */
    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;
        const duration = videoRef.current.duration;
        setVideoDuration(duration);
        setCropEnd(duration);
    };

    /**
     * Handles the end of the annotation process, prompting the user for confirmation before navigating away.
     *
     * @function
     */
    const handleEndAnnotation = () => {
        const confirmEnd = window.confirm("Are you sure you want to end annotation and return to the main page?");
        if (confirmEnd) {
            navigate('/'); // Navigate to the main page (adjust the path if different)
        }
    };

    /**
     * Constructs the source URL for the current frame being viewed.
     *
     * @function
     * @returns {string} - The source URL for the FrameViewer component.
     */
    const getFrameSrc = () => {
        if (frames.length > 0) {
            return `${localhost}/videos/${id}/get_frame/${frames[currentFrameIndex].path.split('/').pop()}`;
        }
        return '';
    };

    // Conditional rendering based on loading and error states
    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (error || !videoMetadata) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error || 'Video not found.'}</div>;
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Navigation Bar Component */}
            <NavigationBar
                isFrameAnnotationMode={isFrameAnnotationMode}
                onEnterFrameMode={fetchFrames}
                onExitFrameMode={() => setIsFrameAnnotationMode(false)}
            />

            <div className="flex-1 flex p-6 gap-6">
                {/* Main Content Area */}
                {isFrameAnnotationMode ? (
                    <div className="flex-1 relative">
                        {/* Frame Viewer Component */}
                        <FrameViewer
                            frameSrc={getFrameSrc()}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            videoContainerRef={videoContainerRef}
                        />
                        {/* Annotation Overlay Component */}
                        <AnnotationOverlay
                            polyps={polyps.filter(polyp => polyp.frame === currentFrameId)}
                            selectedPolyp={selectedPolyp}
                            onSelectPolyp={setSelectedPolyp}
                            onDrag={startDrag}
                            onResize={startResize}
                        />
                        {/* Drawing Rectangle Indicator */}
                        {isDrawing && currentDrawing && (
                            <div
                                className="absolute border-2 border-green-500 bg-green-200 bg-opacity-20"
                                style={{
                                    left: `${currentDrawing.x}px`,
                                    top: `${currentDrawing.y}px`,
                                    width: `${currentDrawing.width}px`,
                                    height: `${currentDrawing.height}px`,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}

                        {/* Frame Navigation Controls */}
                        <div className="mt-4 flex items-center justify-center gap-4">
                            <button
                                onClick={() => setCurrentFrameIndex(prev => Math.max(prev - 1, 0))}
                                className="p-2"
                                disabled={currentFrameIndex === 0}
                                aria-label="Previous Frame"
                            >
                                <SkipBack className="w-6 h-6" />
                            </button>
                            <span>
                                Frame {currentFrameIndex + 1} / {frames.length}
                            </span>
                            <button
                                onClick={() => setCurrentFrameIndex(prev => Math.min(prev + 1, frames.length - 1))}
                                className="p-2"
                                disabled={currentFrameIndex === frames.length - 1}
                                aria-label="Next Frame"
                            >
                                <SkipForward className="w-6 h-6" />
                            </button>
                        </div>

                        {/* End Annotation Button */}
                        {currentFrameIndex === frames.length - 1 && (
                            <button
                                onClick={handleEndAnnotation}
                                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                            >
                                End Annotation
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 relative">
                        {/* Video Player Component */}
                        <VideoPlayer
                            src={uploadedVideoURL || ''}
                            isPlaying={isPlaying}
                            onPlayPause={togglePlay}
                            onSeekFrame={seekFrame}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                        />
                        {/* Annotation Overlay Component */}
                        <AnnotationOverlay
                            polyps={polyps.filter(polyp => !polyp.endFrame)}
                            selectedPolyp={selectedPolyp}
                            onSelectPolyp={setSelectedPolyp}
                            onDrag={startDrag}
                            onResize={startResize}
                        />
                        {/* Drawing Rectangle Indicator */}
                        {isDrawing && currentDrawing && (
                            <div
                                className="absolute border-2 border-green-500 bg-green-200 bg-opacity-20"
                                style={{
                                    left: `${currentDrawing.x}px`,
                                    top: `${currentDrawing.y}px`,
                                    width: `${currentDrawing.width}px`,
                                    height: `${currentDrawing.height}px`,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Sidebar Component */}
                <Sidebar
                    polyps={polyps}
                    selectedPolyp={selectedPolyp}
                    onSelectPolyp={setSelectedPolyp}
                    onEndPolyp={handleEndPolyp}
                    onAddNote={handleAddNote}
                    onDeletePolyp={handleDeletePolyp}
                    isFrameAnnotationMode={isFrameAnnotationMode}
                    currentFrameId={currentFrameId}
                />
            </div>

            {/* Saving Indicator */}
            {saving && <div className="absolute top-0 right-0 p-2 bg-yellow-200 text-yellow-800">Saving...</div>}
        </div>
    );
};

export default VideoAnnotationPage;
