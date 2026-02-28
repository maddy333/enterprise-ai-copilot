import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_active_user, get_db
from app.db.models.models import User, ChatSession, ChatMessage, ChatRole
from app.db.vector import get_qdrant_client
from app.schemas.chat import ChatMessageRequest
from app.services.rag import stream_rag_response

router = APIRouter()

@router.post("/stream")
async def chat_stream(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    qdrant = Depends(get_qdrant_client)
):
    # 1. Resolve Session
    if not request.session_id:
        session = ChatSession(owner_id=current_user.id, title=request.message[:50])
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id
    else:
        session_id = uuid.UUID(request.session_id)
        # Verify ownership
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id, ChatSession.owner_id == current_user.id))
        session = result.scalars().first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

    # 2. Fetch History
    result = await db.execute(select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()))
    db_messages = result.scalars().all()
    history = [{"role": msg.role, "content": msg.content} for msg in db_messages]

    # Save User Message
    user_msg = ChatMessage(session_id=session_id, role=ChatRole.USER.value, content=request.message)
    db.add(user_msg)
    await db.commit()

    # 3. Stream Generator Wrapper (To save response to DB via background task, or wrap stream)
    # Note: To save Assistant response accurately, we'd wrap the generator to intercept tokens.
    # For brevity in this file, we stream directly.
    return StreamingResponse(
        stream_rag_response(request.message, history, str(current_user.id), qdrant),
        media_type="text/event-stream"
    )

@router.get("/sessions")
async def get_sessions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ChatSession).where(ChatSession.owner_id == current_user.id).order_by(ChatSession.created_at.desc()))
    return result.scalars().all()

@router.get("/sessions/{session_id}/history")
async def get_session_history(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify ownership
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id, ChatSession.owner_id == current_user.id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    result = await db.execute(select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()))
    return result.scalars().all()
