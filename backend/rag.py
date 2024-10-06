import logging
import json
import torch
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
import gc
from qdrant_client import QdrantClient, models
from tqdm import tqdm
from typing import List, Dict
import os
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='nasa_api.log',
    filemode='a'
)
logger = logging.getLogger(__name__)

# Set up Google AI credentials
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Set the TOKENIZERS_PARALLELISM environment variable
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Check for GPU availability
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {device}")

# Initialize Qdrant client with in-memory storage
qdrant_client = QdrantClient(":memory:")

# Create embeddings
encoder = SentenceTransformer('all-MiniLM-L6-v2').to(device)

# Set up collection
collection_name = "nasa_osd_research"


def load_nasa_data(file_path: str) -> List[dict]:
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        return list(data.values()) if isinstance(data, dict) else data
    except Exception as e:
        logger.error(f"Error loading NASA data: {str(e)}")
        return []


def process_and_store_data(data, batch_size=100):
    # Always recreate the collection to ensure a clean slate
    try:
        qdrant_client.delete_collection(collection_name)
    except Exception:
        pass  # Collection might not exist, which is fine

    qdrant_client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=encoder.get_sentence_embedding_dimension(),
            distance=models.Distance.COSINE,
        ),
    )

    for i in tqdm(range(0, len(data), batch_size), desc="Processing and storing data"):
        batch = data[i:i+batch_size]
        texts = [json.dumps(item) for item in batch]
        embeddings = encoder.encode(
            texts, convert_to_tensor=True).cpu().numpy()

        points = [
            models.PointStruct(
                id=i+j,
                vector=embedding.tolist(),
                payload={"text": text}
            ) for j, (embedding, text) in enumerate(zip(embeddings, texts))
        ]

        try:
            qdrant_client.upload_points(
                collection_name=collection_name, points=points)
        except Exception as e:
            logger.error(f"Error uploading batch to Qdrant: {str(e)}")

        del points, embeddings
        gc.collect()
        torch.cuda.empty_cache()


def retrieve(query: str, k: int = 5) -> List[str]:
    try:
        query_vector = encoder.encode(
            [query], convert_to_tensor=True).cpu().numpy()
        search_result = qdrant_client.search(
            collection_name=collection_name,
            query_vector=query_vector[0],
            limit=k
        )
        return [hit.payload['text'] for hit in search_result]
    except Exception as e:
        logger.error(f"Error in retrieval: {str(e)}")
        return []


def generate(query: str, context: str) -> str:
    try:
        prompt = f"""Query: {query}

Context: {context}

You are an AI assistant specializing in NASA's Office of Space Development (OSD) research. Based on the given context, which includes previous conversation history and retrieved documents, please provide a concise and informative answer to the query. Focus on OSD-related information and ongoing research projects. If the context doesn't contain relevant information, state that you don't have enough information to answer accurately. Always consider the entire context, including previous exchanges, when formulating your response.

Answer:"""

        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error in generation: {str(e)}")
        return "I apologize, but I encountered an error while generating the response. Please try again."


conversation_history: List[Dict[str, str]] = []


def rag_pipeline(query: str) -> str:
    global conversation_history

    try:
        logger.info(f"Starting RAG pipeline for query: {query}")

        # Include conversation history in the context
        context = " ".join(
            [f"Q: {item['query']}\nA: {item['response']}" for item in conversation_history[-3:]])

        retrieved_docs = retrieve(query, k=3)
        logger.info(f"Retrieved {len(retrieved_docs)} documents")

        # Combine retrieved documents with conversation history
        full_context = context + "\n\n" + " ".join(retrieved_docs)

        response = generate(query, full_context)
        logger.info("Generated response successfully")

        # Update conversation history
        conversation_history.append({"query": query, "response": response})
        if len(conversation_history) > 5:  # Keep only last 5 exchanges
            conversation_history.pop(0)

        return response
    except Exception as e:
        logger.error(f"Error in RAG pipeline: {str(e)}")
        return "An error occurred while processing your query. Please try again."
