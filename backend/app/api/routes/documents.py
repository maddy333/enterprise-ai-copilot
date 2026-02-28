import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_active_user, get_db
from app.db.models.models import User, Document, DocumentStatus
from app.services.document_processor import process_uploaded_document

router = APIRouter()

UPLOAD_DIR = "/tmp/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith((".pdf", ".txt", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, and DOCX files are supported.")
        
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
    
    # Save file to disk/S3 placeholder
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create DB entry
    db_doc = Document(
        id=doc_id,
        title=file.filename,
        file_type=file.filename.split('.')[-1],
        file_size_bytes=str(file_size),
        s3_key=file_path,  # Local path for now
        status=DocumentStatus.UPLOADED.value,
        owner_id=current_user.id
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)
    
    # Queue task for background processing
    process_uploaded_document.delay(doc_id, file_path, str(current_user.id))
    
    # Update status to processing
    db_doc.status = DocumentStatus.PROCESSING.value
    await db.commit()
    
    return {"message": "Document uploaded successfully and is being processed.", "id": db_doc.id}

@router.get("/")
async def get_my_documents(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.owner_id == current_user.id))
    docs = result.scalars().all()
    return docs
