// src/services/annotationService.ts

import axios from 'axios';

export interface AnnotationBase {
    video_id: number;
    frame_id: number;
    polyp_id: number;
    label: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
    start_time: number;
    end_time?: number | null;
    content?: string | null;
}

const localhost = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Function to create or update an annotation
export const createOrUpdateAnnotation = async (annotation: AnnotationBase, authToken: string) => {
    try {
        const response = await axios.post(
            `${localhost}/annotations/`,
            annotation,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Failed to save annotation.');
    }
};

// Function to fetch annotations for a specific frame
export const fetchAnnotationsForFrame = async (frame_id: number, authToken: string) => {
    try {
        const response = await axios.get(
            `${localhost}/annotations/video/${frame_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Failed to fetch annotations.');
    }
};

// Function to delete an annotation
export const deleteAnnotation = async (frame_id: number, polyp_id: number, authToken: string) => {
    try {
        const response = await axios.delete(
            `${localhost}/annotations/${frame_id}/${polyp_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Failed to delete annotation.');
    }
};
