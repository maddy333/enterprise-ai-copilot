from sentence_transformers import SentenceTransformer
from app.core.config import settings

# Load model globally to avoid reloading on every task execution
# On a GPU instance, you might specify device='cuda'
try:
    embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
except Exception as e:
    # Fallback or stub if internet access fails during init in some environments
    import logging
    logging.error(f"Failed to load sentence transformer model: {e}")
    embedding_model = None

def generate_embeddings(text_chunks: list[str]) -> list[list[float]]:
    if not embedding_model:
        raise RuntimeError("Embedding model is not initialized.")
    if not text_chunks:
        return []
    
    # BGE models require instructions for retrieval sometimes, but we use standard embedding here
    # encode() returns a numpy array, we convert to list
    embeddings = embedding_model.encode(text_chunks, normalize_embeddings=True)
    return embeddings.tolist()
