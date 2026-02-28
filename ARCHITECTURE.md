# Enterprise AI Copilot - Technical Architecture Document

## 1. Project Architecture Diagram (Text Representation)

Below is the high-level system architecture designed for scalability, low latency, and distinct separation of concerns.

```text
+-------------------------------------------------------------+
|                      CLIENT TIER                            |
|  React SPA (Vite/Tailwind) - Chat UI, Doc Management        |
+------------------------------+------------------------------+
                               | (REST / Server-Sent Events)
                               v
+-------------------------------------------------------------+
|                     API GATEWAY TIER                        |
|  FastAPI (Uvicorn/Gunicorn) - Routing, ReST API             |
|  JWT Auth Middleware, Rate Limiting, CORS                   |
+-------------------------------------------------------------+
             |                                |
             v                                v
+--------------------------+    +-----------------------------+
|   DOCUMENT PIPELINE      |    |       RAG / CHAT ENGINE     |
| - Text Extractor         |    | - Session/Memory Manager    |
| - Semantic Splitter      |    | - Prompt Orchestrator       |
| - Embeddings Generator   |    | - LLM Output Parser         |
+--------------------------+    +-------------+---------------+
             |                                |
             v                                | (Queries)
         +-------+                            v
         | bge-large-en                  +---------+
         | (Embeddings)                  | LLM     | (Llama-3/Mistral)
         +-------+                       +---------+
             |                                ^
             v                                |
+-------------------------------------------------------------+
|                        DATA TIER                            |
|                                                             |
|  PostgreSQL: Users, Roles, History, Document Metadata       |
|  Pinecone/FAISS: Vector embeddings & hybrid indices         |
|  AWS S3: Raw document blob storage                          |
+-------------------------------------------------------------+
```

## 2. Project Folder Structure

A standardized, production-ready monorepo layout that prevents circular imports, ensures clear separation of domains, and aligns with enterprise microservice conventions.

```text
enterprise-ai-copilot/
├── .github/
│   └── workflows/          # GitHub Actions (CI/CD, linting, tests)
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/     # FastAPI routers (auth, chat, documents)
│   │   │   └── deps.py     # FastAPI dependencies (DB sessions, user context)
│   │   ├── core/
│   │   │   ├── config.py   # Pydantic BaseSettings for env var management
│   │   │   ├── security.py # Hashing, JWT minting/validation
│   │   │   └── logger.py   # Structured JSON logging
│   │   ├── db/
│   │   │   ├── models/     # SQLAlchemy ORM models (Users, Chats)
│   │   │   ├── vector.py   # Vector DB client wrapper (Pinecone/FAISS)
│   │   │   └── session.py  # DB engine setup
│   │   ├── schemas/        # Pydantic validation schemas (Input/Output)
│   │   ├── services/       # Core business logic
│   │   │   ├── auth.py
│   │   │   ├── rag.py      # LangChain/LlamaIndex coordination
│   │   │   └── llm.py      # Direct LLM invocation methods
│   │   └── main.py         # App entry point
│   ├── tests/              # Pytest harness (Unit/Integration)
│   ├── alembic/            # DB schema migrations
│   ├── requirements.txt    # Or pyproject.toml / poetry
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Dumb UI components (Buttons, ChatBubbles)
│   │   ├── features/       # Smart, domain-specific modules (AuthFlow, ChatInterface)
│   │   ├── hooks/          # React hooks (`useAuth`, `useRAGStream`)
│   │   ├── services/       # Axios wrappers for API communication
│   │   ├── store/          # Zustand state management
│   │   └── App.tsx         # Routing
│   ├── package.json
│   └── Dockerfile
├── infra/                  # Terraform / Kubernetes manifests
├── docker-compose.yml      # Local orchestration
└── README.md
```

## 3. Step-by-Step Implementation Roadmap

**Phase 1: Foundation (Weeks 1-2)**
- Setup Git monorepo, linters (Ruff/Black for backend, ESLint for frontend).
- Provision local PostgreSQL. Implement auth flow: SQLAlchemy User models, JWT auth endpoints, and role validation.
- Bootstrap Vite/React application and wire up the Login/Signup pages using Zustand for auth state.

**Phase 2: Ingestion & Vectorization (Weeks 3-4)**
- Implement file upload endpoints. Stream files directly to disk/S3 to avoid RAM saturation.
- Build the processing queue: extract text (`pdfplumber` / `unstructured`), split into chunks, generate embeddings, and upsert to Vector DB alongside tenant metadata (e.g., `user_id`).

**Phase 3: The RAG & Chat Engine (Weeks 5-6)**
- Build the QA retrieval endpoint. Implement similarity search in Vector DB with user filtering.
- Setup LangChain/LlamaIndex. Combine retrieved contexts with conversation history stored in PostgreSQL.
- Implement Server-Sent Events (SSE) `/chat/stream` endpoint for a responsive UI typing effect.

**Phase 4: Frontend Integration & UX Polish (Weeks 7-8)**
- Build the main Chat Interface with markdown rendering, history sidebar, and drag-and-drop file upload.
- Implement proper visual citation links referencing source chunks.
- Add error boundary handling, loading skeletons, and responsive design.

**Phase 5: Productionization (Weeks 9-10)**
- Write Dockerfiles and test via Docker Compose.
- Configure asynchronous workers (Celery/RQ) if document processing needs scaling out.
- Deploy onto AWS ECS / GCP Cloud Run. Hook up Prometheus/Grafana for monitoring latency and token usage.

## 4. Code Skeletons

### Backend: FastAPI Route Wrapper (`app/api/routes/chat.py`)
```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.api.deps import get_current_user
from app.services.rag import stream_rag_response
from app.schemas.chat import ChatRequest

router = APIRouter()

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user = Depends(get_current_user)
):
    # Generates SSE stream natively asynchronously
    generator = stream_rag_response(
        query=request.message, 
        session_id=request.session_id, 
        user_id=current_user.id
    )
    return StreamingResponse(generator, media_type="text/event-stream")
```

### Backend: RAG Service logic (`app/services/rag.py`)
```python
from langchain_core.prompts import PromptTemplate
from app.db.vector import VectorStore

async def stream_rag_response(query: str, session_id: str, user_id: str):
    # 1. Fetch History from Postgres
    history = get_chat_history(session_id)
    
    # 2. Strict Metadata Filtering for Security
    docs = await VectorStore.similarity_search(
        query, 
        k=5, 
        filter={"user_id": user_id} 
    )
    context = "\n---\n".join([d.page_content for d in docs])
    
    # 3. Augment Prompt and Stream
    prompt = f"Context:\n{context}\n\nHistory:\n{history}\n\nQuery:\n{query}"
    
    async for token in LLMClient.astream(prompt):
        yield f"data: {token}\n\n"
```

## 5. API Endpoints List

- `POST /api/v1/auth/register` (Create User)
- `POST /api/v1/auth/token` (Issue JWT)
- `POST /api/v1/documents/` (Upload & trigger embedding pipeline)
- `GET /api/v1/documents/` (List user documents)
- `POST /api/v1/chat/sessions/` (Start new chat thread)
- `GET /api/v1/chat/sessions/{id}/history` (Load past messages)
- `POST /api/v1/chat/stream` (Core RAG inference over SSE)

## 6. AI Architecture Deep Dive

**RAG Pipeline Choices:**
- **Chunking Strategy:** `RecursiveCharacterTextSplitter`. Chunk size `512`, overlap `50`. Small chunks ensure the LLM receives dense mathematical/factual information rather than loose narrative, improving Context Precision.
- **Embedding Model:** `BAAI/bge-large-en-v1.5` (via specialized inference container or HuggingFace TEI). BGE handles complex retrieval tasks significantly better than default OpenAI `ada-002` while retaining data privacy.
- **Prompt Engineering:** Strict system prompts with negative constraints. 
  *Pattern:* `You are a corporate assistant. Answer exactly according to the XML <context>. If the answer is absent, explicitly state "Information not found in documents."`

**Latency Optimization:**
- **Asynchronous Execution:** FastAPI runs on `uvloop`. LLM network calls and DB queries MUST strictly use `async`/`await`.
- **Text Streaming:** Returning the first token in <200ms hides the total generation time (TTFB vs. total latency).
- **Quantization:** Serving Mistral/Llama models quantized to 4-bit (AWQ/GPTQ) via vLLM.

**Cost Optimization:**
- Implementing **Semantic Caching** (e.g., GPTCache). If User B asks a semantically identical question to User A, return the cached result instead of hitting the LLM API.
- Limit Context Window usage by implementing a fast Keyword/BM25 sparse search before running heavy dense embeddings.

## 7. Advanced Features for Senior Engineers

1. **Re-Ranking Layer (Cross-Encoder):** Base vector search retrieves top 20 chunks. Pass these to a cross-encoder (like `Cohere Rerank` or `BGE-Reranker`) to sort the absolute best 5 chunks before feeding to the LLM. Drastically improves QA quality.
2. **Agentic Routing:** Instead of naive RAG, use the LLM to classify the query intent first. Does the user want a summary? Does the user want a specific fact search? Route to different specialized retrieval chains.
3. **Data Security (Multi-Tenancy Partitioning):** Hardcode namespace/metadata filtering. `user_id` MUST be securely injected by JWT middlewares into the VectorDB query engine to prevent cross-tenant data leaks.
4. **Asynchronous Task Queue:** Heavy PDFs (1000+ pages) will timeout an HTTP request. Introduce Celery & Redis to handle ingestion, giving users a WebSocket/SSE ping when their document says "Ready".

## 8. Common Senior-Level Pitfalls

1. **Vector Search Blindness:** Relying solely on Vector search fails miserably on exact-match queries (e.g., "Find invoice #1234"). **Fix:** Implement Hybrid Search (Vector + Sparse/BM25).
2. **Context Stuffing:** Shoving 50 document chunks into an LLM window causes "Lost in the Middle" syndrome. **Fix:** Re-rank, strictly limit context size, and ensure prompt engineering forces citations.
3. **Blocking the Event Loop:** A junior mistake in FastAPI is using standard blocking `requests.post()` to call the vector DB or LLM. **Fix:** Strictly enforce `aiohttp` or `AsyncClient`.
4. **Token Exhaustion:** Allowing unlimited chat history context. **Fix:** Implement a sliding window memory algorithm or summarize older messages in the background.

## 9. Resume-Ready Project Description

**[Project Name] | Enterprise AI Document Copilot | Lead Full-Stack Engineer**
*Architected and deployed a production-grade Retrieval-Augmented Generation (RAG) platform, enabling secure, contextual conversation over proprietary corporate documents.*
- Designed a scalable, async microservices backend using **Python/FastAPI** and **LangChain**, handling distributed document processing (PDF/DOCX) via asynchronous task queues.
- Engineered a high-precision retrieval pipeline utilizing hybrid search (Dense + BM25) with **Vector Databases (FAISS/Pinecone)** and cross-encoder re-ranking to yield <500ms retrieval latencies.
- Implemented robust multi-tenant data security and JWT role-based access control, preventing cross-leakage of indexed embedded contexts natively at the query level.
- Built a responsive **React/Zustand** frontend integrating Server-Sent Events (SSE) for real-time text generation streaming, significantly elevating UX while maintaining clear source citations and logging via **PostgreSQL**.
