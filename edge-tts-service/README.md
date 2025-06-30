# Edge TTS Service

A dedicated service for high-quality text-to-speech synthesis using Microsoft Edge TTS.

## Features

- High-quality neural voices from Microsoft Edge
- Multiple output formats (binary audio, base64)
- Batch processing support
- Voice listing and selection
- RESTful API interface
- CORS enabled for browser integration

## Installation

```bash
cd edge-tts-service
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The service will run on port 3001 by default.

## API Endpoints

### Health Check
```
GET /health
```

### Get Available Voices
```
GET /api/voices
```

Returns a list of available English voices with their properties.

### Synthesize Speech (Binary Audio)
```
POST /api/synthesize
Content-Type: application/json

{
  "text": "Hello, this is a test message",
  "voice": "en-US-AriaNeural",
  "rate": "0%",
  "volume": "0%",
  "pitch": "0Hz"
}
```

Returns binary audio data (WAV format).

### Synthesize Speech (Base64)
```
POST /api/synthesize/base64
Content-Type: application/json

{
  "text": "Hello, this is a test message",
  "voice": "en-US-AriaNeural",
  "rate": "0%",
  "volume": "0%",
  "pitch": "0Hz"
}
```

Returns JSON with base64-encoded audio.

### Batch Synthesis
```
POST /api/synthesize/batch
Content-Type: application/json

{
  "texts": ["First message", "Second message", "Third message"],
  "voice": "en-US-AriaNeural",
  "rate": "0%",
  "volume": "0%",
  "pitch": "0Hz"
}
```

## Popular Voices

- `en-US-AriaNeural` - Natural female voice
- `en-US-DavisNeural` - Natural male voice
- `en-US-JennyNeural` - Assistant-style female voice
- `en-US-GuyNeural` - Conversational male voice

## Integration with Frontend

The frontend can call this service for high-quality TTS while falling back to browser TTS if the service is unavailable.

## Environment Variables

- `PORT` - Service port (default: 3001)

## Error Handling

The service includes comprehensive error handling and will return appropriate HTTP status codes and error messages.
