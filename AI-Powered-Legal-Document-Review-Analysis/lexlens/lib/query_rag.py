import sys
import os
import json
from sentence_transformers import SentenceTransformer
import chromadb

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query text provided"}))
        sys.exit(1)
        
    query_text = sys.argv[1]
    top_k = 5
    if len(sys.argv) > 2:
        try:
            top_k = int(sys.argv[2])
        except ValueError:
            pass
            
    # Resolve vector store path relatively so it is portable
    persist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "vector_store"))
    collection_name = "pdf_documents"
    
    if not os.path.exists(persist_dir):
        print(json.dumps({"error": f"Vector store path not found at {persist_dir}"}))
        sys.exit(1)
            
    try:
        # Load embedding model and disable warnings
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        model = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Connect to Chroma
        client = chromadb.PersistentClient(path=persist_dir)
        collection = client.get_collection(name=collection_name)
        
        # Generate embedding
        query_embedding = model.encode([query_text])[0]
        
        # Exclude Computer Networks notes from legal searches
        exclude_sources = [
            "Unit 3 - Computer Networks.pdf",
            "Unit 4 - Computer Networks.pdf",
            "Unit 5 - Computer Networks.pdf"
        ]
        
        # Query Chroma
        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k,
            where={"source": {"$nin": exclude_sources}}
        )
        
        retrieved_docs = []
        if results['documents'] and results['documents'][0]:
            documents = results['documents'][0]
            metadatas = results['metadatas'][0]
            distances = results['distances'][0]
            ids = results['ids'][0]
            
            for doc_id, content, metadata, distance in zip(ids, documents, metadatas, distances):
                similarity_score = 1 - distance
                retrieved_docs.append({
                    "id": doc_id,
                    "content": content,
                    "source": metadata.get("source", "Unknown"),
                    "page": metadata.get("page", 0),
                    "similarity_score": float(similarity_score)
                })
                
        print(json.dumps({"sources": retrieved_docs}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
