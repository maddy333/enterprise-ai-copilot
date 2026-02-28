import pdfplumber
from docx import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from loguru import logger

def extract_text(file_path: str) -> str:
    text = ""
    if file_path.endswith('.pdf'):
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    elif file_path.endswith('.docx'):
        doc = Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    elif file_path.endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        logger.warning(f"Unsupported file format for extraction: {file_path}")
    return text

def chunk_text(text: str) -> list[str]:
    # Semantic chunking tuned for Dense Retrieval
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = splitter.split_text(text)
    return chunks
