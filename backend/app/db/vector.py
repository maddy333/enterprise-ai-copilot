from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Distance, VectorParams
from app.core.config import settings

qdrant_client = AsyncQdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)

COLLECTION_NAME = "enterprise_documents"

async def init_qdrant() -> None:
    collections = await qdrant_client.get_collections()
    if COLLECTION_NAME not in [c.name for c in collections.collections]:
        await qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
        )

async def get_qdrant_client() -> AsyncQdrantClient:
    return qdrant_client
