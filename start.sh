#!/bin/bash

# Start both Next.js and Python FastAPI servers concurrently

echo "Starting Credential Manager Application..."
echo ""

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Check if Python dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

echo ""
echo "Starting servers..."
echo "- Next.js frontend: http://localhost:3000"
echo "- Python backend: http://localhost:8000"
echo "- API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Run both servers in parallel
npm run dev &
NEXT_PID=$!

cd python_backend && python3 run.py &
PYTHON_PID=$!

# Trap Ctrl+C and kill both processes
trap "kill $NEXT_PID $PYTHON_PID; exit" INT

# Wait for both processes
wait $NEXT_PID $PYTHON_PID
