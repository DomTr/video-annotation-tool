"""
This module handles annotations for videos in the backend application.
It provides endpoints for creating, reading, updating, and deleting annotations
on video frames.

File path: /backend/app/routers/annotations.py

Paths:
- POST /annotations/
    - Create a new annotation or update an existing one.
- GET /annotations/video/{frame_id}
    - Retrieve annotations for a specific video frame.
- DELETE /annotations/{frame_id}/{polyp_id}
    - Delete an annotation for a specific frame and polyp.
- GET /annotations/total_amount_polyps/{video_id}
    - Count the distinct number of polyp IDs for a video.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session
from ..dependencies import get_current_user
from ..models import Annotations, VideoRaw, Frames
from ..schemas import AnnotationCreate, AnnotationBase
from ..dependencies.database import get_db

router = APIRouter(
    prefix="/annotations",
    tags=["annotations"],
    responses={status.HTTP_404_NOT_FOUND: {"description": "Not found"}},
)


@router.post(
    "/",
    response_model=AnnotationBase,
    dependencies=[Depends(get_current_user)],
    status_code=status.HTTP_201_CREATED
)
def create_annotation(
        annotation: AnnotationCreate,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user),
) -> AnnotationBase:
    """
    Create or update an annotation in the database.

    If an annotation with the same frame_id and polyp_id already exists,
    it is updated. Otherwise, a new annotation is created.

    Args:
        annotation (AnnotationCreate): The annotation to create or update.
        db (Session): The database session.
        current_user (User): The user creating or updating the annotation.

    Returns:
        AnnotationBase: The created or updated annotation.

    Raises:
        HTTPException: If the video or frame does not exist.
    """
    # Validate video existence
    video = db.query(VideoRaw).filter(VideoRaw.id == annotation.video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Mark video as annotated
    video.isAnnotated = True
    db.commit()

    # Validate frame existence
    frame = db.query(Frames).filter(Frames.id == annotation.frame_id).first()
    if not frame:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frame not found")

    # Check for existing annotation and handle accordingly
    db_annotation_entry = (
        db.query(Annotations)
        .filter(
            and_(
                Annotations.frame_id == annotation.frame_id,
                Annotations.polyp_id == annotation.polyp_id,
            )
        )
        .first()
    )

    if db_annotation_entry:
        # Update the existing annotation
        db_annotation_entry.label = annotation.label
        db_annotation_entry.x1 = annotation.x1
        db_annotation_entry.y1 = annotation.y1
        db_annotation_entry.x2 = annotation.x2
        db_annotation_entry.y2 = annotation.y2
        db_annotation_entry.width = annotation.width
        db_annotation_entry.height = annotation.height
        db_annotation_entry.start_time = annotation.start_time
        db_annotation_entry.end_time = annotation.end_time

        db.commit()
        db.refresh(db_annotation_entry)
        return db_annotation_entry

    # Create a new annotation
    db_annotation = Annotations(
        video_id=annotation.video_id,
        frame_id=annotation.frame_id,
        user_id=current_user.id,
        polyp_id=annotation.polyp_id,
        label=annotation.label,
        x1=annotation.x1,
        y1=annotation.y1,
        x2=annotation.x2,
        y2=annotation.y2,
        width=annotation.width,
        height=annotation.height,
        start_time=annotation.start_time,
        end_time=annotation.end_time,
    )
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    return db_annotation


@router.get(
    "/video/{frame_id}",
    dependencies=[Depends(get_current_user)],
    )
def get_annotations_for_video(
        frame_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user),
):
    """
    Retrieve annotations for a specific frame.

    Args:
        frame_id (int): The ID of the frame to retrieve annotations for.
        db (Session): The database session.

    Returns:
        List[AnnotationBase]: A list of annotations for the given frame.

    Raises:
        HTTPException: If no annotations are found for the frame.
    """
    annotations = db.query(Annotations).filter(Annotations.frame_id == frame_id).all()
    if not annotations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No annotations found for the given frame"
        )
    return annotations

@router.delete(
    "/{frame_id}/{polyp_id}",
    dependencies=[Depends(get_current_user)],
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_annotation(
        frame_id: int,
        polyp_id: int,
        db: Session = Depends(get_db),
) -> None:  # Added return type annotation
    """
    Delete an annotation by frame ID and polyp ID.

    Args:
       frame_id (int): The ID of the frame containing the annotation.
       polyp_id (int): The ID of the polyp to delete.
       db (Session): The database session.

    Returns:
       None: A successful deletion returns no content (204 No Content).

    Raises:
       HTTPException: If the frame or annotation does not exist.
    """
    # Validate frame existence
    frame = db.query(Frames).filter(Frames.id == frame_id).first()
    if not frame:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frame not found")

    db_annotation_entry = (
        db.query(Annotations)
        .filter(
            and_(
                Annotations.frame_id == frame_id,
                Annotations.polyp_id == polyp_id,
            )
        )
        .first()
    )

    if db_annotation_entry:
        try:
            db.delete(db_annotation_entry)
            db.commit()
        except Exception as exc:
            db.rollback()  # In case of any error, rollback the transaction
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while deleting the annotation.",
            ) from exc
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotation not found.")


@router.get(
    "/total_amount_polyps/{video_id}",
    dependencies=[Depends(get_current_user)],
    response_model=dict
)
def count_polyp_ids(
        video_id: int,
        db: Session = Depends(get_db),
) -> dict:
    """
    Count the number of distinct polyp IDs for a given video.

    Note: This functionality is currently not in use since we don't make a distinction
    between different polyps, so there is no unique polyp ID for each polyp.

    Args:
        video_id (int): The ID of the video for which to count distinct polyp IDs.
        db (Session): The database session.

    Returns:
        dict: A dictionary containing the video ID and the distinct polyp count.

    Raises:
        HTTPException: If no annotations are found for the given video.
    """
    # Query the distinct polyp_ids for the given video_id
    count = (
        db.query(Annotations.polyp_id)
        .filter(Annotations.video_id == video_id)
        .distinct()
        .count()
    )

    if count is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No annotations found for the given video"
        )

    return {"video_id": video_id, "distinct_polyp_count": count}
