from typing import Optional
import uuid
from pydantic import BaseModel

class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None # If None, creates a new session
