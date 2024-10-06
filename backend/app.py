import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
from contextlib import asynccontextmanager
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
from typing import List, Dict
from rag import load_nasa_data, process_and_store_data, rag_pipeline

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='nasa_api.log',
    filemode='a'
)
logger = logging.getLogger(__name__)

# Load NASA data
nasa_data = load_nasa_data("nasa_space_challenge_data.json")
df = pd.DataFrame(nasa_data)


class Query(BaseModel):
    text: str
    session_id: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Process and store NASA data
    process_and_store_data(nasa_data)
    logger.info("Application started and data indexed")
    yield
    # Shutdown
    logger.info("Application shutting down")

app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/query")
async def query_data(query: Query):
    logger.info(f"Received query for session {query.session_id}: {query.text}")
    start_time = time.time()

    try:
        response = rag_pipeline(query.text)

        end_time = time.time()
        logger.info(
            f"Generated response for session {query.session_id}. Time taken: {end_time - start_time:.2f} seconds")
        return {"response": response}
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        return {"response": "An error occurred while processing your query. Please try again."}


def suggest_charts(df: pd.DataFrame) -> List[Dict]:
    suggested_charts = []
    numeric_columns = df.select_dtypes(include=[np.number]).columns
    categorical_columns = df.select_dtypes(include=['object']).columns

    # Suggest scatter plots for numeric columns
    for i, col1 in enumerate(numeric_columns):
        for col2 in numeric_columns[i+1:]:
            suggested_charts.append({
                "type": "scatter",
                "x_axis": col1,
                "y_axis": col2,
                "title": f"{col1} vs {col2}"
            })

    # Suggest bar charts for categorical columns
    for cat_col in categorical_columns:
        for num_col in numeric_columns:
            suggested_charts.append({
                "type": "bar",
                "x_axis": cat_col,
                "y_axis": num_col,
                "title": f"{num_col} by {cat_col}"
            })

    # Suggest line charts for time series (if any date columns exist)
    date_columns = df.select_dtypes(include=['datetime64']).columns
    for date_col in date_columns:
        for num_col in numeric_columns:
            suggested_charts.append({
                "type": "line",
                "x_axis": date_col,
                "y_axis": num_col,
                "title": f"{num_col} over time"
            })

    return suggested_charts[:10]  # Limit to 10 suggestions


@app.get("/suggest_charts")
async def get_suggested_charts():
    logger.info("Received request for suggested charts")
    try:
        suggested_charts = suggest_charts(df)
        logger.info(f"Generated {len(suggested_charts)} chart suggestions")
        return {"suggested_charts": suggested_charts}
    except Exception as e:
        logger.error(
            f"Error generating chart suggestions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def generate_matplotlib_code(request: dict) -> str:
    chart_type = request["type"]
    x_axis = request["x_axis"]
    y_axis = request["y_axis"]
    title = request["title"]

    code = f"""
import matplotlib.pyplot as plt

# Assuming df is your DataFrame
x = df['{x_axis}']
y = df['{y_axis}']

plt.figure(figsize=(10, 6))
"""

    if chart_type == "scatter":
        code += f"plt.scatter(x, y)\n"
    elif chart_type == "line":
        code += f"plt.plot(x, y)\n"
    elif chart_type == "bar":
        code += f"plt.bar(x, y)\n"
    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    code += f"""
plt.xlabel('{x_axis}')
plt.ylabel('{y_axis}')
plt.title('{title}')
plt.tight_layout()
plt.show()
"""

    return code


@app.post("/generate_chart")
async def generate_chart(request: dict):
    logger.info(f"Received chart generation request: {request}")
    start_time = time.time()
    try:
        # Generate Matplotlib code
        matplotlib_code = generate_matplotlib_code(request)

        # Generate the chart
        plt.figure(figsize=(10, 6))

        if request["type"] == "scatter":
            plt.scatter(df[request["x_axis"]], df[request["y_axis"]])
        elif request["type"] == "line":
            plt.plot(df[request["x_axis"]], df[request["y_axis"]])
        elif request["type"] == "bar":
            plt.bar(df[request["x_axis"]], df[request["y_axis"]])
        else:
            logger.warning(
                f"Unsupported chart type requested: {request['type']}")
            raise HTTPException(
                status_code=400, detail="Unsupported chart type")

        plt.xlabel(request["x_axis"])
        plt.ylabel(request["y_axis"])
        plt.title(request["title"])
        plt.tight_layout()

        # Save the chart to a bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)

        # Encode the image to base64
        img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

        plt.close()  # Close the figure to free up memory

        end_time = time.time()
        logger.info(
            f"Chart generated successfully. Time taken: {end_time - start_time:.2f} seconds")

        return {
            "chart_data": img_base64,
            "matplotlib_code": matplotlib_code
        }
    except Exception as e:
        logger.error(f"Error generating chart: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting the application...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
