import json
import logging
from typing import AsyncGenerator
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from sentence_transformers import CrossEncoder

from app.core.config import settings
from app.services.embeddings import generate_embeddings
from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger(__name__)

# Initialize Cross-Encoder for Re-ranking
try:
    reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
except Exception as e:
    logger.error(f"Failed to load reranker: {e}")
    reranker = None

# Initialize LLM Client
if settings.GEMINI_API_KEY:
    llm_client = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.1
    )
else:
    llm_client = None

async def retrieve_and_rerank(query: str, user_id: str, qdrant: AsyncQdrantClient, top_k: int = 5) -> list[dict]:
    # 1. Embed query
    query_vector = generate_embeddings([query])[0]
    
    # 2. Vector Search with strict Tenant Filtering
    search_result = await qdrant.search(
        collection_name="enterprise_documents",
        query_vector=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=20 # Fetch more for reranking
    )
    
    if not search_result:
        return []
        
    contexts = [hit.payload for hit in search_result]
    
    # 3. Cross-Encoder Re-ranking
    if reranker and len(contexts) > 0:
        pairs = [[query, ctx["text"]] for ctx in contexts]
        scores = reranker.predict(pairs)
        for ctx, score in zip(contexts, scores):
            ctx["rerank_score"] = float(score)
            
        # Sort by rerank score descending
        contexts = sorted(contexts, key=lambda x: x["rerank_score"], reverse=True)
        
    return contexts[:top_k]

async def stream_rag_response(query: str, chat_history: list[dict], user_id: str, qdrant: AsyncQdrantClient) -> AsyncGenerator[str, None]:
    # Retrieve top chunks
    contexts = await retrieve_and_rerank(query, user_id, qdrant)
    
    # Format Prompt
    context_str = "\n---\n".join([f"Source Doc ID: {ctx['document_id']}\nText: {ctx['text']}" for ctx in contexts])
    
    system_prompt = (
        "You are an Enterprise AI Copilot. Answer the user's question strictly based on the provided context.\n"
        "If you do not know the answer based on the context, explicitly say 'Information not found in documents.'\n"
        "Cite the Source Doc ID when using information.\n\n"
        f"<context>\n{context_str}\n</context>"
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Append history
    for msg in chat_history[-10:]: # Include last 10 messages for context window bounds
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": query})
    
    try:
        response_stream = await llm_client.chat.completions.create(
            model="gpt-3.5-turbo" if settings.LLM_PROVIDER == "openai" else "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            messages=messages,
            stream=True,
            temperature=0.1
        )
        
        async for chunk in response_stream:
            content = chunk.choices[0].delta.content
            if content:
                yield f"data: {json.dumps({'content': content})}\n\n"
                
        # Send citations at the end of the stream
        yield f"data: {json.dumps({'citations': [{'doc_id': c['document_id']} for c in contexts]})}\n\n"
        
    except Exception as e:
        logger.error(f"Error streaming from LLM: {str(e)}")
        yield f"data: {json.dumps({'error': 'Failed to generate response'})}\n\n"
