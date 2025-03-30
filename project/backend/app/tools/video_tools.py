import logging
import os
from typing import List, Optional

import cv2
import aiofiles
import asyncio
import shutil

from datetime import datetime, timedelta, time

from sqlalchemy import cast, Integer
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from fastapi import UploadFile

from .. import models
from ..dependencies.database import get_db
from ..models import Frames
from ..schemas import FrameInfo


UPLOAD_DIRECTORY = "uploads"
FRAMES_DIRECTORY = "frames"


class VideoTools:
    def __init__(self, db_session: Session = None):
        self.video = None
        self.video_path = None
        self.video_folder_path = None
        self.frames_folder_path = None
        self.video_title = None
        self.video_description = None
        self.frame_rate = 1
        self.frame_amount = 50

        self.frames_load_finished = False

        self.video_duration = 0

        self.video_id = None
        self.date = None

        # Configure logger
        self.logger = logging.getLogger(__name__)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

        # Use the provided session if available, otherwise create a new session
        if db_session is None:
            try:
                self.db = next(get_db())
            except StopIteration:
                self.logger.error("Failed to obtain a database session.")
                raise
        else:
            self.db = db_session

    def setup(
        self,
        file: UploadFile,
        title: str = "",
        description: str = "",
        video_id: int = -1,
        framerate: int = 1,
        date: datetime = datetime.now(),
    ):
        self.video = file
        if title == "":
            self.video_title = self.video.filename.split(".")[0]
        else:
            self.video_title = title

        if video_id != -1:
            self.video_id = video_id

        self.video_description = description
        self.frame_rate = framerate
        self.date = date

    async def video_get_saved(self) -> Optional[models.VideoRaw]:
        """Save the uploaded video to disk and create a database entry."""
        # Ensure the upload directory exists
        await asyncio.to_thread(os.makedirs, UPLOAD_DIRECTORY, exist_ok=True)

        file_base_name, _ = os.path.splitext(self.video.filename)
        self.video_folder_path = os.path.join(UPLOAD_DIRECTORY, file_base_name)

        if os.path.exists(self.video_folder_path):
            self.logger.warning(
                f"Video folder already exists: {self.video_folder_path}"
            )
            return None
        else:
            await asyncio.to_thread(os.makedirs, self.video_folder_path, exist_ok=True)

        self.video_path = os.path.join(self.video_folder_path, self.video.filename)

        # Save the uploaded video file asynchronously
        async with aiofiles.open(self.video_path, "wb") as f:
            content = await self.video.read()
            await f.write(content)
            self.logger.info(f"Video saved to {self.video_path}")

        # Retrieve video metadata using OpenCV
        video_capture = cv2.VideoCapture(self.video_path)
        if not video_capture.isOpened():
            self.logger.error(f"Failed to open video: {self.video_path}")
            raise ValueError(f"Could not open the video file: {self.video_path}")

        try:
            fps = video_capture.get(cv2.CAP_PROP_FPS)
            frame_count = video_capture.get(cv2.CAP_PROP_FRAME_COUNT)

            if fps == 0:
                self.logger.error(
                    "FPS value is zero, cannot proceed with frame extraction."
                )
                raise ValueError(
                    "FPS value is zero, cannot proceed with frame extraction."
                )

            duration = frame_count / fps
            self.video_duration = int(duration)

            self.logger.info(
                f"Video FPS: {fps}, Frame Count: {frame_count}, Duration: {duration} seconds"
            )

        finally:
            video_capture.release()
            self.logger.debug(
                "VideoCapture resource released after metadata extraction."
            )

        # Set frames folder path
        self.frames_folder_path = os.path.join(self.video_folder_path, FRAMES_DIRECTORY)

        # Create a database entry for the video
        db = await self.load_into_db()

        return db

    async def make_frames(self) -> bool:
        """Create frames from the video asynchronously."""
        # Ensure the frames directory exists
        await asyncio.to_thread(os.makedirs, self.frames_folder_path, exist_ok=True)

        # Extract frames in a separate thread to prevent blocking
        await asyncio.to_thread(self.extract_frames)

        return True

    def extract_frames(self):
        """Extract frames from the video at specified intervals and save them."""
        video_capture = cv2.VideoCapture(self.video_path)
        if not video_capture.isOpened():
            self.logger.error(f"Could not open the video file: {self.video_path}")
            raise ValueError(f"Could not open the video file: {self.video_path}")

        try:
            fps = video_capture.get(cv2.CAP_PROP_FPS)
            if fps == 0:
                self.logger.error(
                    "FPS value is zero, cannot proceed with frame extraction."
                )
                raise ValueError(
                    "FPS value is zero, cannot proceed with frame extraction."
                )

            self.logger.info(f"Video FPS: {fps}")
            self.logger.info(f"Starting frame extraction for video: {self.video_title}")

            frames_to_add: List[models.Frames] = []
            frame_index = 0

            while True:
                success, frame = video_capture.read()
                if not success:
                    break

                if frame_index % self.frame_rate == 0:
                    self.logger.debug(f"Processing frame {frame_index}.")

                    frame_filename = os.path.join(
                        self.frames_folder_path,
                        f"{self.video_title}_{frame_index:04d}.jpg",
                    )
                    # Save frame with optimized parameters
                    try:
                        cv2.imwrite(
                            frame_filename,
                            frame,
                            [
                                int(cv2.IMWRITE_JPEG_QUALITY),
                                90,
                            ],  # Adjust JPEG quality as needed
                        )
                        self.logger.debug(f"Frame saved: {frame_filename}")
                    except cv2.error as e:
                        self.logger.error(f"Failed to write frame {frame_index}: {e}")
                        frame_index += 1
                        continue  # Skip this frame and continue

                    # Calculate the relative time of the frame
                    relative_time_seconds = frame_index / fps
                    relative_time = self._seconds_to_time(relative_time_seconds)

                    db_frame = models.Frames(
                        file_path=frame_filename,
                        file_number=frame_index,
                        video_time=relative_time,
                        video_time_milliseconds=int((relative_time_seconds % 1) * 1000),
                        video_id=self.video_id,
                    )
                    frames_to_add.append(db_frame)

                    self.logger.debug(
                        f"Frame {frame_index} at {relative_time} added to the batch."
                    )

                frame_index += 1

            # Bulk insert frames into the database
            if frames_to_add:
                try:
                    self.db.bulk_save_objects(frames_to_add)
                    self.db.commit()
                    self.logger.info(
                        f"Inserted {len(frames_to_add)} frames into the database."
                    )
                except SQLAlchemyError as e:
                    self.db.rollback()
                    self.logger.error(f"Database error during bulk insert: {e}")
                    raise

            self.frames_load_finished = True
            self.logger.info("_______FINISHED FRAME EXTRACTION__________")

            # Update the video record with frame details
            self._update_video_record(frame_index)

        except Exception as e:
            self.logger.exception(f"An error occurred during frame extraction: {e}")
            raise

        finally:
            video_capture.release()
            self.logger.debug("VideoCapture resource released after frame extraction.")

    @staticmethod
    def _seconds_to_time(seconds: float) -> time:
        """Convert seconds to a time object (HH:MM:SS)."""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return time(hour=hours, minute=minutes, second=seconds)

    def _update_video_record(self, total_frames: int):
        """Update the VideoRaw record with frame information."""
        try:
            db_video = (
                self.db.query(models.VideoRaw)
                .filter(models.VideoRaw.id == self.video_id)
                .first()
            )
            if db_video:
                db_video.amount_frames = total_frames
                db_video.frames_load_finished = self.frames_load_finished
                db_video.frames_folder_path = self.frames_folder_path
                self.db.commit()
                self.logger.info(
                    f"Video record {self.video_id} updated with {total_frames} frames."
                )
            else:
                self.logger.warning(
                    f"No VideoRaw record found with id {self.video_id}."
                )
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error(f"Database error during video record update: {e}")
            raise

    async def load_into_db(self) -> models.VideoRaw:
        """Load video information into the database."""
        db_video = models.VideoRaw(
            title=self.video_title,
            description=self.video_description,
            file_path=self.video_path,
            frames_folder_path=self.frames_folder_path,
            amount_frames=0,
            duration=self.video_duration,
            upload_date=self.date,
            frames_load_finished=self.frames_load_finished,
            isAnnotated=False
        )
        self.db.add(db_video)
        self.db.commit()
        self.db.refresh(db_video)

        self.video_id = db_video.id

        self.logger.info(f"Video record created with ID: {self.video_id}")

        return db_video

    async def get_infos_of_videos_in_db(
        self, skip: int, limit: int
    ) -> List[models.VideoRaw]:
        """Retrieve video information from the database."""
        videos = self.db.query(models.VideoRaw).offset(skip).limit(limit).all()
        self.logger.debug(f"Retrieved {len(videos)} videos from the database.")
        return videos

    async def set_video_from_db(
        self, vid_id: int = -1, frame_rate: int = 1, frame_amount: int = -1
    ) -> Optional[models.VideoRaw]:
        """Set video information from the database."""
        video = (
            self.db.query(models.VideoRaw).filter(models.VideoRaw.id == vid_id).first()
        )

        if not video:
            self.logger.warning(f"No VideoRaw record found with id {vid_id}.")
            return None

        self.video_path = video.file_path
        self.video_folder_path = os.path.dirname(video.file_path)
        self.frames_folder_path = video.frames_folder_path
        self.video_title = video.title
        self.video_description = video.description

        # these variables aren't given every time
        if frame_amount == -1:
            self.frame_amount = self.get_amount_of_frames()
        else:
            self.frame_amount = frame_amount

        if vid_id != -1:
            self.video_id = vid_id

        self.frame_rate = frame_rate

        self.logger.info(f"VideoTools set to video ID: {self.video_id}")

        return video

    async def delete_video(self) -> bool:
        """Delete video and associated frames from the filesystem and database."""
        if not self.video_id or not self.video_folder_path:
            self.logger.error("Video ID or folder path not set. Cannot delete video.")
            return False

        # Remove the folder and all its contents
        try:
            shutil.rmtree(self.video_folder_path)
            self.logger.info(f"Deleted video folder: {self.video_folder_path}")
        except Exception as e:
            self.logger.error(f"Failed to delete video folder: {e}")
            raise

        # Remove the annotation data inside the frames table in the db
        try:
            self.db.query(models.Annotations).filter(
                models.Annotations.video_id == self.video_id
            ).delete()
            self.logger.info(
                f"Deleted annotation associated with video ID: {self.video_id}"
            )
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error(f"Database error during annotation deletion: {e}")
            raise

        # Remove the frames data inside the frames table in the db
        try:
            self.db.query(models.Frames).filter(
                models.Frames.video_id == self.video_id
            ).delete()
            self.logger.info(
                f"Deleted frames associated with video ID: {self.video_id}"
            )
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error(f"Database error during frames deletion: {e}")
            raise

        # Remove the video data inside the video table in the db
        try:
            self.db.query(models.VideoRaw).filter(
                models.VideoRaw.id == self.video_id
            ).delete()
            self.logger.info(f"Deleted video record with ID: {self.video_id}")
            self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error(f"Database error during video record deletion: {e}")
            raise

        return True

    async def delete_frames_in_db(self) -> bool:
        """Delete frames from the database."""
        if not self.video_id:
            self.logger.error("Video ID not set. Cannot delete frames.")
            return False

        try:
            self.db.query(models.Frames).filter(
                models.Frames.video_id == self.video_id
            ).delete()
            self.db.commit()
            self.logger.info(f"Deleted all frames for video ID: {self.video_id}")
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error(f"Database error during frames deletion: {e}")
            raise

    async def get_filtered_frames_rate(self) -> List[FrameInfo]:
        """Retrieve frames that match the frame rate filter, returning frame IDs and paths."""
        filtered_frames = []
        if os.path.exists(self.frames_folder_path) and os.path.isdir(
            self.frames_folder_path
        ):
            # Fetch all frames for the video from the database
            frames_in_db = (
                self.db.query(Frames).filter(Frames.video_id == self.video_id).all()
            )
            if not frames_in_db:
                self.logger.warning(
                    f"No frames found in the database for video_id {self.video_id}"
                )
                return []

            for frame in frames_in_db:
                frame_number = frame.id  # Assuming 'id' corresponds to frame_number
                # Apply the frame rate filter
                if (frame_number % self.frame_rate) == 0:
                    filtered_frames.append(FrameInfo(id=frame.id, path=frame.file_path))

            # Sort the filtered frames by frame_id
            filtered_frames.sort(key=lambda x: x.id)
        else:
            self.logger.warning("Frames folder not found or is not a directory")
            filtered_frames = []

        return filtered_frames

    async def get_filtered_frames_amount(self) -> List[str]:
        """Retrieve a specific amount of frames based on frame_amount."""
        filtered_frames = []
        self.logger.debug(f"Frames folder path: {self.frames_folder_path}")

        if os.path.exists(self.frames_folder_path) and os.path.isdir(
            self.frames_folder_path
        ):
            try:
                frame_files = sorted(
                    os.listdir(self.frames_folder_path),
                    key=lambda x: int(x.split("_")[-1].split(".")[0]),
                )
            except (IndexError, ValueError) as e:
                self.logger.error(f"Error sorting frame files: {e}")
                return []

            total_frames = len(frame_files)

            if total_frames > self.frame_amount:
                step = total_frames // self.frame_amount

                for i in range(self.frame_amount):
                    index = i * step
                    filtered_frames.append(frame_files[index])
            else:
                filtered_frames = frame_files
        else:
            self.logger.warning("Frames folder not found or is not a directory")
            filtered_frames = []

        return filtered_frames

    async def get_info_of_frame_from_db(
        self, file_name: str
    ) -> Optional[models.Frames]:
        """Retrieve frame information from the database based on file name."""
        if not self.video_id:
            self.logger.error("No video ID defined. Please set the video first.")
            raise ValueError("No video ID defined. Please set the video first.")

        try:
            frame_number = int(file_name.split("_")[-1].split(".")[0])
        except (IndexError, ValueError) as e:
            self.logger.error(f"Invalid file name format: {file_name}, Error: {e}")
            return None

        frame = (
            self.db.query(models.Frames)
            .filter(
                cast(models.Frames.file_number, Integer)
                == int(file_name.split("_")[-1].split(".")[0]),
                models.Frames.video_id == self.video_id,
            )
            .first()
        )
        if frame:
            self.logger.debug(f"Retrieved frame from DB: {frame.file_path}")
        else:
            self.logger.warning(f"No frame found in DB for file number: {frame_number}")

        return frame

    def get_amount_of_frames(self) -> int:
        """Calculate the total number of frames in the frames folder."""
        self.logger.debug(f"Frames folder path: {self.frames_folder_path}")

        if not os.path.exists(self.frames_folder_path):
            self.logger.warning("Frames folder does not exist.")
            return 0

        return sum(
            1
            for entry in os.listdir(self.frames_folder_path)
            if os.path.isfile(os.path.join(self.frames_folder_path, entry))
        )

    def get_frame_path(self, frame_name: str) -> str:
        """Get the full path of a specific frame."""
        return os.path.join(self.frames_folder_path, frame_name)

    def get_video_path(self) -> str:
        """Get the full path of the video."""
        return self.video_path
