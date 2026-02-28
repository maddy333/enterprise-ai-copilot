# Enterprise AI Document Copilot

An enterprise-grade, production-ready AI Copilot leveraging Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG) to provide an intelligent, context-aware conversational interface over uploaded documents. 

## Features

- **Robust Authentication:** JWT-based user authentication with Role-Based Access Control (Admin/User).
- **Document Management:** Secure upload, parsing, and pipeline orchestration for PDFs, DOCX, and Text files.
- **Advanced RAG Pipeline:** Semantic chunking, hybrid search, and cross-encoder re-ranking for high-precision context retrieval.
- **Verifiable Responses:** LLM responses are grounded in provided context with exact source document citations.
- **Persistent Chat Memory:** PostgreSQL-backed conversation history to maintain context across multi-turn chats.
- **Modern UI/UX:** React frontend featuring a sleek, ChatGPT-style interface with real-time text streaming.
- **Cloud-Native Deployment:** Fully Dockerized stack optimized for deployment on AWS ECS or GCP Cloud Run.

## Tech Stack

### Backend
- **Framework:** Python, FastAPI (Asynchronous, High-throughput)
- **AI Orchestration:** LangChain / LlamaIndex
- **LLM Engine:** Open-source models via vLLM or text-generation-inference (e.g., Llama-3, Mixtral)
- **Embeddings:** BAAI/bge-large-en-v1.5 (Open-source, state-of-the-art retrieval)

### Frontend
- **Framework:** React / Vite (or Next.js)
- **State Management:** Zustand
- **Styling:** Tailwind CSS + Shadcn UI

### Infrastructure & Data Layer
- **Relational DB:** PostgreSQL (Users, Sessions, Metadata)
- **Vector DB:** FAISS (Local/Dev) or Pinecone/Milvus (Production)
- **Object Storage:** AWS S3 / MinIO (Raw document storage)
- **DevOps:** Docker, Docker Compose, GitHub Actions

## Installation & Setup (Local Development)

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+

### 1. Clone the Repository
```bash
git clone https://github.com/maddy333/enterprise-ai-copilot.git
cd enterprise-ai-copilot
```

### 2. Environment Variables
Copy the template environment file and fill in your credentials:
```bash
cp .env.example .env
```
*(Ensure you add your Vector DB API keys and PostgreSQL credentials if not using defaults)*

### 3. Run with Docker Compose
To start the entire stack (PostgreSQL, Vector DB, FastAPI Backend, React Frontend):
```bash
docker-compose up --build
```

### 4. Access the Application
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database:** `localhost:5432`

## Architecture Overview

Refer to `ARCHITECTURE.md` for a comprehensive deep-dive into the RAG design, system components, scaling strategies, and senior-level architectural choices.

