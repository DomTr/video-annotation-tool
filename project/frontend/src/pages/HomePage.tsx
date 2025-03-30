import React, { useContext, useEffect, useState } from 'react';
import { Upload, Trash2, Edit2, LogOut, Check, Loader } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../context/AuthContext";

/**
 * Represents a video item in the dashboard.
 */
interface VideoItem {
  /** Unique identifier for the video */
  id: number;

  /** Title of the video */
  title: string;

  /** Date when the video was uploaded */
  upload_date: string;

  /** Duration of the video in seconds */
  duration: string;

  /** Indicates whether the video has been annotated */
  isAnnotated: boolean;

  /** Name of the physician associated with the video */
  physician: string;

  /** Indicates whether frames have been loaded for the video */
  frames_loaded: boolean;
}

/**
 * EntAnnotationDashboard component handles video uploads, displays a list of videos,
 * and provides functionalities for annotating and deleting videos.
 *
 * @component
 */
const EntAnnotationDashboard: React.FC = () => {
  // State to hold the list of videos
  const [videos, setVideos] = useState<VideoItem[]>([]);

  // State to manage loading status
  const [loading, setLoading] = useState<boolean>(true);

  // State for search functionality
  const [searchTerm, setSearchTerm] = useState<string>("");

  // State for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // State to hold frames data for a selected video
  const [frames, setFrames] = useState<string[]>([]);

  // State to control the visibility of frames modal
  const [showFrames, setShowFrames] = useState<boolean>(false);

  // State to display error messages
  const [error, setError] = useState<string>('');

  // State for video upload form fields
  const [title, setTitle] = useState<string>(''); // Title of the video
  const [description, setDescription] = useState<string>(''); // Description of the video
  const [framerate, setFramerate] = useState<number>(30); // Framerate, default to 30

  // Backend URL configuration
  const localhost = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  // Authentication context to access authToken and setAuthToken
  const { authToken, setAuthToken , user} = useContext(AuthContext);

  // Navigation hook to programmatically navigate routes
  const navigate = useNavigate();

  // Number of items to display per page
  const itemsPerPage = 10;

  /**
   * Fetches videos from the backend API whenever currentPage, authToken, or localhost changes.
   *
   * @async
   * @function
   * @returns {Promise<void>}
   */
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
            `${localhost}/videos/?skip=${(currentPage - 1) * itemsPerPage}&limit=${itemsPerPage}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
              },
            }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch videos.");
        }

        const data: VideoItem[] = await response.json();
        console.log("data:", JSON.stringify(data));
        setVideos(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load videos. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [currentPage, authToken, localhost]);

  /**
   * Retrieves the duration of a video file.
   *
   * @param {File} file - The video file to extract duration from.
   * @returns {Promise<number>} - A promise that resolves to the video's duration in seconds.
   */
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject('Failed to load video metadata.');
      };

      video.src = URL.createObjectURL(file);
    });
  };

  /**
   * Handles the upload of a video file.
   *
   * @async
   * @function
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event triggered by the file input.
   * @returns {Promise<void>}
   */
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.mp4')) {
      alert('Invalid file type. Only .mp4 files are allowed.');
      return;
    }

    try {
      // Extract video duration
      const duration = await getVideoDuration(file);

      // Prepare form data for upload
      const formData = new FormData();
      formData.append('title', title || file.name.split('.').slice(0, -1).join('.')); // Use entered title or default to file name without extension
      formData.append('description', description || ''); // Use entered description or leave empty
      formData.append('framerate', framerate.toString()); // Use entered framerate
      formData.append('file', file); // Append the file
      if (user) {
        formData.append('physician', user.name); // Assuming 'physician' is the user's name
        // If you have user ID or other relevant fields, include them as needed
      } else {
        formData.append('physician', 'Dr.Unknown'); // Fallback if user data is not available
      }
      formData.append('date', new Date().toISOString().split("T")[0]); // Default date

      // Send POST request to upload the video
      const response = await fetch(`${localhost}/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`, // Include auth token if required
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload video.');
      }

      const data = await response.json();
      console.log(data); // For debugging purposes

      // Update the videos state with the newly uploaded video
      setVideos((prevVideos) => [
        ...prevVideos,
        {
          id: data.id,
          title: title || file.name.split('.').slice(0, -1).join('.'),
          upload_date: new Date().toISOString().split("T")[0],
          duration: `${Math.round(duration)}s`,
          isAnnotated: false,
          physician: user ? user.name : "Dr.Unknown",
          frames_loaded: false, // Assuming frames are not loaded yet
        },
      ]);

      // Start processing frames after successful upload
      const videoId = data.id; // Assuming the API returns the video ID

      const framesResponse = await fetch(`${localhost}/videos/${videoId}/make_frames`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!framesResponse.ok) {
        const errorData = await framesResponse.json();
        throw new Error(errorData.detail || 'Failed to process video frames.');
      }

      const framesData = await framesResponse.json();
      if (framesData.successful) {
        setVideos((prevVideos) =>
            prevVideos.map((video) =>
                video.id === videoId ? { ...video, frames_loaded: true } : video
            )
        );
      } else {
        throw new Error('Failed to create video frames.');
      }

      // Reset form fields after successful upload
      setTitle('');
      setDescription('');
      setFramerate(30);
      event.target.value = ''; // Reset file input
    } catch (error: any) {
      console.error("Error uploading video:", error);
      setError(`Error uploading video: ${error.message || JSON.stringify(error)}`);
    }
  };

  /**
   * Handles the deletion of a video.
   *
   * @async
   * @function
   * @param {number} id - The unique identifier of the video to be deleted.
   * @returns {Promise<void>}
   */
  const handleDelete = async (id: number): Promise<void> => {
    // Confirm deletion with the user
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const response = await fetch(`${localhost}/videos/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (response.status === 204) {
        setVideos((prevVideos) => prevVideos.filter((video) => video.id !== id));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete video.");
      }
    } catch (err) {
      console.error(err);
      setError("Error deleting video. Please try again.");
    }
  };

  /**
   * Navigates the user to the annotation page for a specific video.
   *
   * @function
   * @param {number} id - The unique identifier of the video to annotate.
   */
  const handleAnnotate = (id: number): void => {
    navigate(`/video/${id}`);
  };

  /**
   * Handles user logout by clearing the auth token and navigating to the login page.
   *
   * @function
   */
  const handleLogout = () => {
    setAuthToken(null);
    navigate('/login');
  };

  /**
   * Filters the list of videos based on the search term.
   */
  const filteredVideos = videos.filter((videoItem) =>
      videoItem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Formats the duration string into a more readable format.
   *
   * @function
   * @param {string} duration - The duration in seconds as a string.
   * @returns {string} - The formatted duration string.
   */
  const formatDuration = (duration: string): string => {
    const totalSeconds = parseInt(duration, 10); // Convert string to number
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Display error messages if any */}
          {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                {error}
              </div>
          )}

          <div className="mb-8">
            {/* Upload Form */}
            <form className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <label
                    htmlFor="file-input"
                    className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  Upload Video
                </label>
                <input
                    id="file-input"
                    type="file"
                    name="video"
                    accept="video/mp4"
                    onChange={handleUpload}
                    className="hidden"
                />
              </div>

              {/* Additional Fields for Title, Description, Framerate */}
            </form>
          </div>

          {/* Logout Button */}
          <div className="flex justify-end mb-4">
            <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          {/* Search Input */}
          <input
              type="text"
              placeholder="Search videos..."
              className="mb-4 border p-2 rounded w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search Videos"
          />

          {/* Video List */}
          {loading ? (
              <div className="text-center text-gray-500">Loading...</div>
          ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Video Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Frames Loaded
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Physician
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVideos.map((video) => (
                        <tr key={video.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {video.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {video.frames_loaded ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Loader className="h-4 w-4 animate-spin text-gray-500" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {video.upload_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(video.duration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {video.physician}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                            className={`px-2 py-1 rounded-full text-xs ${
                                video.isAnnotated
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                            }`}
                        >
                          {video.isAnnotated ? "Annotated" : "Pending"}
                        </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex gap-2">
                              <button
                                  onClick={() => handleAnnotate(video.id)}
                                  className="inline-flex items-center p-2 border rounded-md hover:bg-gray-50"
                                  aria-label={`Annotate ${video.title}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                  onClick={() => handleDelete(video.id)}
                                  className="inline-flex items-center p-2 border rounded-md text-red-600 hover:bg-red-50"
                                  aria-label={`Delete ${video.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
          )}

          {/* Pagination Controls */}
          <div className="flex justify-center mt-4">
            <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 border rounded-md mr-2 ${
                    currentPage === 1
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 hover:bg-gray-200"
                }`}
                aria-label="Previous Page"
            >
              Previous
            </button>
            <span className="mx-4">{currentPage}</span>
            <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-4 py-2 bg-gray-100 border rounded-md hover:bg-gray-200"
                aria-label="Next Page"
            >
              Next
            </button>
          </div>

          {/* Frames Modal */}
          {showFrames && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-4 rounded max-w-3xl w-full max-h-full overflow-y-auto">
                  <button
                      onClick={() => setShowFrames(false)}
                      className="text-red-500 font-bold mb-4"
                      aria-label="Close Frames Modal"
                  >
                    Close
                  </button>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {frames.map((frame, index) => (
                        <img
                            key={index}
                            src={`${localhost}/videos/${frame}`}
                            alt={`Frame ${index}`}
                            className="w-full h-auto"
                        />
                    ))}
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default EntAnnotationDashboard;
