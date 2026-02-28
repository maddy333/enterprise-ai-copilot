from celery import shared_task
from loguru import logger
import asyncio

@shared_task(name="process_uploaded_document")
def process_uploaded_document(document_id: str, file_path: str, user_id: str):
    logger.info(f"Received task to process document {document_id} at {file_path}")
    from app.services.extractor import extract_text, chunk_text
    from app.services.embeddings import generate_embeddings
    from qdrant_client import QdrantClient
    from qdrant_client.http.models import PointStruct
    from app.core.config import settings
    
    try:
        # Extract and chunk
        text = extract_text(file_path)
        chunks = chunk_text(text)
        
        # Embed
        vectors = generate_embeddings(chunks)
        
        # Upsert synchronously in Celery
        client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        
        points = []
        import uuid
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "document_id": document_id,
                        "user_id": user_id,
                        "text": chunk,
                        "chunk_index": i
                    }
                )
            )
            
        if points:
            client.upsert(
                collection_name="enterprise_documents",
                points=points
            )
            
        logger.info(f"Successfully processed and embedded document {document_id} ({len(chunks)} chunks)")
        
        # Ideally, fire an event or update DB status indicating completion here
        return {"status": "success", "document_id": document_id, "chunks": len(chunks)}
        
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {str(e)}")
        raise
