# 📚 RAG (Retrieval-Augmented Generation)

A simple Retrieval-Augmented Generation (RAG) pipeline built using LangChain, FAISS, ChromaDB, and Sentence Transformers.

This project demonstrates how to:

- Load and process documents
- Split text into chunks
- Generate vector embeddings
- Store embeddings in a vector database
- Retrieve relevant context using semantic search
- Build the foundation for LLM-powered question answering

---

## 🚀 Features

- PDF document ingestion
- Text document support
- Semantic chunking
- Vector embeddings with Sentence Transformers
- FAISS vector search
- ChromaDB support
- LangChain integration
- Notebook-based experimentation

---

## 📂 Project Structure

```bash
Rag/
│
├── data/
│   └── text_file/
│       ├── ml_intro.txt
│       └── python_intro.txt
│
├── notebook/
│   └── document.ipynb
│
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 🛠 Tech Stack

| Component | Technology |
|------------|------------|
| Framework | LangChain |
| Embeddings | Sentence Transformers |
| Vector Store | FAISS |
| Vector Database | ChromaDB |
| PDF Processing | PyPDF, PyMuPDF |
| Language | Python |

---

## Installation

### Clone Repository

```bash
git clone https://github.com/rohitlodhi-hub/Rag.git

cd Rag
```

### Create Virtual Environment

```bash
python -m venv venv
```

Activate:

**Windows**

```bash
venv\Scripts\activate
```

**Linux / Mac**

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

or

```bash
pip install .
```

---

## 📄 Data Sources

Current sample dataset includes:

- Python Introduction
- Machine Learning Introduction

You can replace these files with your own:

```bash
data/text_file/
```

or add PDF documents for ingestion.

---

## 🔄 RAG Workflow

```text
Documents
    │
    ▼
Text Splitting
    │
    ▼
Embeddings Generation
    │
    ▼
Vector Database
    │
    ▼
Similarity Search
    │
    ▼
Relevant Context
    │
    ▼
LLM Response
```

---

## Example Use Cases

- Chat with PDFs
- Internal company knowledge base
- Research assistant
- Technical documentation search
- Personal AI knowledge repository

---

## Future Improvements

- [ ] Streamlit UI
- [ ] Chat interface
- [ ] OpenAI/Gemini integration
- [ ] Hybrid search
- [ ] Metadata filtering
- [ ] Multi-document support
- [ ] Reranking pipeline
- [ ] Production deployment

---

## Learning Goals

This project is intended to help understand:

- Vector databases
- Embeddings
- Semantic search
- Retrieval pipelines
- RAG architecture
- LangChain ecosystem

---

## Author

**Rohit Lodhi**

- GitHub: https://github.com/rohitlodhi-hub
