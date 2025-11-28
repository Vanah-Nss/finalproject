#!/bin/bash
# Test script for image upload endpoint

echo "Testing image upload endpoint..."
echo "Make sure Django server is running on http://127.0.0.1:8000"
echo ""

# Create a test image if it doesn't exist
if [ ! -f "test_image.png" ]; then
  echo "Creating test image..."
  convert -size 100x100 xc:blue test_image.png 2>/dev/null || echo "Install ImageMagick to create test image, or use your own image"
fi

# Test upload
if [ -f "test_image.png" ]; then
  echo "Uploading test_image.png..."
  curl -X POST http://127.0.0.1:8000/api/upload-image \
    -F "file=@test_image.png" \
    -v
else
  echo "No test image found. Please create a test_image.png file."
fi
