import base64
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
    status,
    Form,
    WebSocket,
    Request,
)
from fastapi.responses import FileResponse, StreamingResponse

from urllib.parse import parse_qs

import base64

import json
from datetime import datetime

import base64

from .. import schemas, User
from ..dependencies import get_current_user
from ..dependencies.database import get_db
from ..schemas import FrameInfo
from ..tools import VideoTools

import os
import re
from starlette.status import HTTP_206_PARTIAL_CONTENT, HTTP_204_NO_CONTENT


router = APIRouter(
    prefix="/videos",
    tags=["videos"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "/upload",
    response_model=schemas.Videoraw,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a video",
    description="Upload a video file to the server.",
)
async def upload_video(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    framerate: int = Form(...),
    upload_date: Optional[datetime] = Form(None),
    physician: str = Form(...),
    file: UploadFile = File(...),
    db_session=Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename.lower().endswith(".mp4"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .mp4 is allowed.",
        )


    vid_tool = VideoTools()
    if not title:
        title = file.filename.split(".")[0]
    vid_tool.setup(file, title, description, framerate, upload_date)
    video_db = await vid_tool.video_get_saved()
    if not video_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can't save file. Either the video already exists or there was an error.",
        )

    file_path = vid_tool.get_video_path()
    print("time:", video_db.duration)
    video = schemas.Videoraw(
        id=video_db.id,
        title=video_db.title,
        description=video_db.description,
        file_path=file_path,
        upload_date=video_db.upload_date,
        user_id=None,
        frames_loaded=False,
        physician="Dr. Example",
        duration=video_db.duration,
        isAnnotated=video_db.isAnnotated
    )
    return video


# backend/routes/videos.py


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(video_id: int, current_user: User = Depends(get_current_user)):
    vid_tool = VideoTools()

    video_data = await vid_tool.set_video_from_db(vid_id=video_id)
    if not video_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Video_id not found in db"
        )
    else:
        res = await vid_tool.delete_video()

        if not res:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete video",
            )
        else:
            return HTTP_204_NO_CONTENT


@router.get("/{video_id}/make_frames")
async def make_frames(video_id: int):
    vid_tool = VideoTools()

    video_data = await vid_tool.set_video_from_db(vid_id=video_id)

    req_succesful = await vid_tool.make_frames()

    return {"message": "make frames out of video", "successful": req_succesful}


# @router.get("/", response_model=List[schemas.Video], dependencies=[Depends(auth.has_permission("view_videos"))])
@router.get("/")
async def list_videos(
    skip: int = 0,
    limit: int = 10,
    # current_user: models.User = Depends(auth.get_current_active_user)  # Uncomment if using authentication
):
    vid_tool = VideoTools()

    videos_db = await vid_tool.get_infos_of_videos_in_db(skip=skip, limit=limit)

    schema_videos = []
    for video_db in videos_db:
        video = schemas.Videoraw(
            id=video_db.id,
            title=video_db.title,
            description=video_db.description,
            file_path=video_db.file_path,
            upload_date=video_db.upload_date,
            user_id=None,
            frames_loaded=video_db.frames_load_finished,
            duration=video_db.duration,
            isAnnotated=video_db.isAnnotated
        )

        schema_videos.append(video)

    return schema_videos


# @router.get("/{video_id}", response_model=schemas.Video, dependencies=[Depends(auth.has_permission("view_videos"))])
@router.get("/{video_id}")
async def get_video(video_id: int, request: Request):
    vid_tool = VideoTools()

    video = await vid_tool.set_video_from_db(vid_id=video_id)

    # Check if the video exists in the database
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Video not found"
        )

    # Check if the file exists at the given path
    if not os.path.exists(video.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Video file not found"
        )

    file_size = os.path.getsize(video.file_path)
    range_header = request.headers.get("Range", None)
    if range_header:
        if range_header:
            byte1, byte2 = 0, None

            # Parse the Range header
            match = re.search(r"bytes=(\d+)-(\d*)", range_header)
            if match:
                groups = match.groups()
                byte1 = int(groups[0])
                if groups[1]:
                    byte2 = int(groups[1])

            byte2 = byte2 if byte2 is not None else file_size - 1
            length = byte2 - byte1 + 1

        def iterfile():
            with open(video.file_path, "rb") as f:
                f.seek(byte1)
                remaining = length
                chunk_size = 1024 * 1024  # 1MB
                while remaining > 0:
                    read_length = min(chunk_size, remaining)
                    data = f.read(read_length)
                    if not data:
                        break
                    yield data
                    remaining -= len(data)

        headers = {
            "Content-Range": f"bytes {byte1}-{byte2}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "video/mp4",
        }

        return StreamingResponse(
            iterfile(), status_code=HTTP_206_PARTIAL_CONTENT, headers=headers
        )
    else:
        return FileResponse(
            path=video.file_path, media_type="video/mp4", filename=video.title
        )


@router.get("/{video_id}/metadata", response_model=schemas.Videoraw)
async def get_video_metadata(video_id: int, db_session=Depends(get_db)):
    """
    Retrieves metadata for a specific video.
    """
    vid_tool = VideoTools()
    video = await vid_tool.set_video_from_db(vid_id=video_id)

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Video not found"
        )

    schema_video = schemas.Videoraw(
        id=video.id,
        title=video.title,
        description=video.description,
        file_path=video.file_path,
        upload_time=video.upload_date,
        user_id=video.user_id,
        frames_loaded=video.frames_load_finished,
        duration=video.duration,
    )

    return schema_video


@router.get(
    "/{video_id}/get_frames_path/rate/{frame_rate}", response_model=List[FrameInfo]
)
async def get_frames_path(video_id: int, frame_rate: int):
    vid_tool = VideoTools()

    video = await vid_tool.set_video_from_db(vid_id=video_id, frame_rate=frame_rate)
    filtered_frames = await vid_tool.get_filtered_frames_rate()

    # Check if the video exists in the database
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Video not found"
        )

    if type(filtered_frames) is not list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=filtered_frames
        )

    # If no frames match the criteria
    if len(filtered_frames) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No frames found"
        )

    return filtered_frames


@router.get("/{video_id}/get_frames_path/amount/{frame_amount}")
async def get_frames_path1(video_id: int, frame_amount: int):
    vid_tool = VideoTools()

    video_data = await vid_tool.set_video_from_db(
        vid_id=video_id, frame_amount=frame_amount
    )
    filtered_frames = await vid_tool.get_filtered_frames_amount()

    # Check if the video exists in the database
    if not video_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Video_id not found in db"
        )

    if type(filtered_frames) is not list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=filtered_frames
        )

    # If no frames match the criteria
    if len(filtered_frames) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No frames found"
        )

    return {"filtered_frames": filtered_frames}


@router.get("/{video_id}/get_frame/{frame_name}")
async def get_frames_path2(video_id: int, frame_name: str):
    vid_tool = VideoTools()
    video_data = await vid_tool.set_video_from_db(vid_id=video_id)
    if not video_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="video_id not found in dbs"
        )

    frame_path = vid_tool.get_frame_path(frame_name=frame_name)

    # Check if the file exists at the given path
    if not os.path.exists(frame_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Frame file not found"
        )

    return FileResponse(
        path=frame_path,
        media_type="image/jpg",
        filename=video_data.title + frame_path.split("_")[-1].split(".")[0],
    )


@router.get("/{video_id}/get_frame_info/{frame_name}")
async def get_frames_path3(video_id: int, frame_name: str):
    vid_tool = VideoTools()
    video_data = await vid_tool.set_video_from_db(vid_id=video_id)

    if not video_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="video_id not found in dbs"
        )

    frame = await vid_tool.get_info_of_frame_from_db(file_name=frame_name)

    # Check if the video exists in the database
    if not frame:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="frame not found"
        )

    return {"filtered_frames": frame}


@router.websocket("/ws/frames")
async def websocket_get_all_frames(websocket: WebSocket):
    # Parse query parameters from the WebSocket connection URL
    query_params = parse_qs(websocket.scope["query_string"].decode())
    video_id = query_params.get("video_id", ["1"])[0]

    vid_tool = VideoTools()
    video_data = await vid_tool.set_video_from_db(vid_id=video_id)
    filtered_frames = await vid_tool.get_filtered_frames_rate()

    await websocket.accept()

    if not video_data:
        await websocket.send_text("this video_id is not found in database.")
        await websocket.close()
        return

    if not filtered_frames or len(filtered_frames) == 0:
        await websocket.send_text("no frames found.")
        await websocket.close()
        return

    filtered_frames = [filtered_frames[0]]

    for frame in filtered_frames:
        file_path = os.path.join(video_data.frames_folder_path, frame)
        frame_info = await vid_tool.get_info_of_frame_from_db(file_name=frame)

        # Read the image file
        with open(file_path, "rb") as frame_file:
            frame_data = frame_file.read()

        # Create a dictionary to send filename and image data
        # TODO: change not latin
        message = {
            "file_name": frame,
            "timestamp": str(frame_info.video_time),
            "abs_time_millisec": str(frame_info.video_time_milliseconds),
            "image_data": frame_data.decode(
                "latin1"
            ),  # Use latin1 to safely encode binary data as string
        }

        # Send the JSON-encoded message with the image and filename
        await websocket.send_text(json.dumps(message))

    await websocket.send_text("All images sent.")
    await websocket.close()


@router.websocket("/ws/frame_amount")
async def websocket_get_amount_of_frames(websocket: WebSocket):
    # Parse query parameters from the WebSocket connection URL
    query_params = parse_qs(websocket.scope["query_string"].decode())

    video_id = int(
        query_params.get("video_id", ["1"])[0]
    )  # Default to "1" if not provided
    frames_amount = int(
        query_params.get("frames_amount", ["10"])[0]
    )  # Default to 10 if not provided

    await websocket.accept()

    vid_tool = VideoTools()
    video_data = await vid_tool.set_video_from_db(
        vid_id=video_id, frame_amount=frames_amount
    )
    filtered_frames = await vid_tool.get_filtered_frames_amount()

    print("filtered_frames:", filtered_frames, type(filtered_frames))
    # Check if the video exists in the database
    if not video_data:
        await websocket.send_text("Error: this video_id is not found in database.")
        await websocket.close()
        return

    if type(filtered_frames) is not list:
        await websocket.send_text("Error: this video_id is not found in database.")
        await websocket.close()
        return

    # If no frames match the criteria
    if len(filtered_frames) == 0:
        await websocket.send_text("Error: No frames found")
        await websocket.close()
        return

    await upload_frames_with_websocket(
        filtered_frames, video_data.frames_folder_path, vid_tool, websocket
    )


@router.websocket("/ws/get_frames_range")
async def websocket_get_range_of_frames(websocket: WebSocket):
    # Parse query parameters from the WebSocket connection URL
    query_params = parse_qs(websocket.scope["query_string"].decode())

    video_id = int(
        query_params.get("video_id", ["1"])[0]
    )  # Default to "1" if not provided
    frame_number = int(query_params.get("frames_number", ["0"])[0])
    frames_range = int(
        query_params.get("frames_range", ["5"])[0]
    )  # Default to 10 if not provided

    await websocket.accept()

    vid_tool = VideoTools()
    video_data = await vid_tool.set_video_from_db(vid_id=video_id)
    filtered_frames = await vid_tool.get_filtered_frames_rate()

    # Check if the video exists in the database
    if not video_data:
        error_message = {
            "status": "ERROR",
            "description": "this video_id is not found in database",
        }
        await websocket.send_text(json.dumps(error_message))
        await websocket.close()
        return

    if type(filtered_frames) is not list:
        error_message = {
            "status": "ERROR",
            "description": "this video_id is not found in database",
        }
        await websocket.send_text(json.dumps(error_message))
        await websocket.close()
        return

    # If no frames match the criteria
    if len(filtered_frames) == 0:
        error_message = {"status": "ERROR", "description": "No frames found"}
        await websocket.send_text(json.dumps(error_message))
        await websocket.close()

        return

    frame_list = []
    index = 0

    for i in range(len(filtered_frames)):
        if str(frame_number) in filtered_frames[i]:
            index = i
            # if you want the frame also the frame with which you are searching
            frame_list.append(filtered_frames[i])

            break

    for i in range(frames_range):
        if index + i + 1 < len(filtered_frames):
            frame_list.append(filtered_frames[index + i + 1])
        if index - i - 1 >= 0:
            frame_list.append(filtered_frames[index - i - 1])
    frame_list = sorted(frame_list, key=lambda x: int(x.split("_")[-1].split(".")[0]))
    print(frame_list)

    await upload_frames_with_websocket(
        frame_list, video_data.frames_folder_path, vid_tool, websocket
    )


async def upload_frames_with_websocket(
    filtered_frames, frames_folder, vid_tool: VideoTools, websocket: WebSocket
):
    for frame in filtered_frames:
        file_path = os.path.join(frames_folder, frame)
        frame_info = await vid_tool.get_info_of_frame_from_db(file_name=frame)

        # Read the image file
        with open(file_path, "rb") as frame_file:
            frame_data = frame_file.read()

        # Encode the binary image data to base64
        encoded_image_data = base64.b64encode(frame_data).decode("utf-8")
        # Create a dictionary to send filename and image data
        message = {
            "status": "SENDING",
            "frame_id": frame_info.id,
            "file_name": frame,
            "timestamp": str(frame_info.video_time),
            "abs_time_millisec": str(frame_info.video_time_milliseconds),
            "image_data": encoded_image_data,  # Base64-encoded image data
        }

        message = json.dumps(message)
        print("Message type:", message)
        # Send the JSON-encoded message with the image and filename
        await websocket.send_text(message)

    finish_message = {"status": "FINISHED"}
    await websocket.send_text(json.dumps(finish_message))

    await websocket.close()
