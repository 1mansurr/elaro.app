#!/bin/sh

echo "Decoding google-services.json from env variable..."
echo $GOOGLE_SERVICES_JSON | base64 --decode > android/app/google-services.json
echo "✅ google-services.json created" 