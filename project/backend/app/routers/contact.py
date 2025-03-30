# backend/routers/contact.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from ..dependencies.database import get_db
from ..dependencies import get_current_user
from ..schemas import user
from ..utils.email import send_contact_email

router = APIRouter(
    prefix="/contact",
    tags=["contact"],
    responses={404: {"description": "Not found"}},
)


# Pydantic Schema for Contact Form
class ContactForm(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=1000)


@router.post(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Submit Contact Form",
    description="Send a contact message to the site administrators.",
)
async def submit_contact_form(
    form: ContactForm,
    db_session=Depends(get_db),
    current_user: user = Depends(
        get_current_user
    ),
):
    """
    Handle contact form submissions by sending an email.
    """
    try:
        await send_contact_email(name=form.name, email=form.email, message=form.message)
        return {"message": "Your message has been sent successfully."}
    except Exception:
        # Log the error as needed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while sending your message. Please try again later.",
        )
