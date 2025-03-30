#!/bin/sh

echo "==== Environment Variables ===="
echo "PYTHONPATH: $PYTHONPATH"

echo "==== Listing /app Directory ===="
ls -la /app

echo "==== Starting Uvicorn ===="
exec uvicorn app.main:app --host 0.0.0.0 --port 8080

