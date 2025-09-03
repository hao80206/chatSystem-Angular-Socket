#!/bin/bash

echo "Stopping existing server processes..."
pkill -f "node server/server.js"

echo "Waiting for processes to stop..."
sleep 2

echo "Starting server..."
cd serverSide
node server/server.js 