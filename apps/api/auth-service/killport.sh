#!/bin/bash

# This script finds and kills processes using a specific port

if [ -z "$1" ]; then
  echo "Usage: $0 <port>"
  exit 1
fi

PORT=$1

echo "Finding processes using port $PORT..."

# Find the process ID using the port
PID=$(lsof -t -i:$PORT)

if [ -z "$PID" ]; then
  echo "No process found using port $PORT"
  exit 0
fi

echo "Found process ID: $PID"

# Kill the process
echo "Killing process..."
kill -9 $PID

if [ $? -eq 0 ]; then
  echo "Successfully killed process using port $PORT"
else
  echo "Failed to kill process"
fi
