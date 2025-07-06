import express from 'express';
import cors from 'cors';
import { EdgeTTS } from '@andresaya/edge-tts';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Don't use a global EdgeTTS instance - create fresh ones for each request
// const tts = new EdgeTTS(); // REMOVED - causes state issues

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Edge TTS Service', timestamp: new Date().toISOString() });
});

// Get available voices
app.get('/api/voices', async (req, res) => {
  try {
    console.log('📋 Fetching available voices...');
    
    // Create fresh EdgeTTS instance for voices
    const tts = new EdgeTTS();
    const voices = await tts.getVoices();
    
    // Filter and categorize voices
    const englishVoices = voices
      .filter(voice => voice.Locale.startsWith('en-'))
      .map(voice => ({
        name: voice.ShortName,
        displayName: voice.FriendlyName,
        gender: voice.Gender,
        locale: voice.Locale,
        styleList: voice.StyleList || [],
        rolePlayList: voice.RolePlayList || []
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    console.log(`✅ Retrieved ${englishVoices.length} English voices`);
    res.json({
      success: true,
      count: englishVoices.length,
      voices: englishVoices
    });
  } catch (error) {
    console.error('❌ Error fetching voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voices',
      message: error.message
    });
  }
});

// Text-to-speech synthesis endpoint
app.post('/api/synthesize', async (req, res) => {
  try {
    const { 
      text, 
      voice = 'en-US-AriaNeural', 
      rate = '30%', 
      volume = '40%', 
      pitch = '2Hz',
      format = 'audio'
    } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    console.log(`🎤 Synthesizing text with voice: ${voice}`);
    console.log(`📝 Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

    const tts = new EdgeTTS();
    
    // Synthesize the speech
    await tts.synthesize(text, voice, {
      rate,
      volume,
      pitch
    });

    let finalAudioBuffer = null;
    
    try {
      // Method 1: Try toRaw() first
      const rawAudio = await tts.toRaw();
      console.log(`📊 Raw audio type: ${typeof rawAudio}, size: ${rawAudio?.length || 'unknown'}`);
      
      if (rawAudio && rawAudio.length > 1000) { // Ensure substantial audio data
        // Handle both Buffer and string responses from EdgeTTS
        if (typeof rawAudio === 'string') {
          // If it's a base64 string, decode it
          console.log('🔄 Converting base64 string to buffer...');
          finalAudioBuffer = Buffer.from(rawAudio, 'base64');
        } else if (Buffer.isBuffer(rawAudio)) {
          finalAudioBuffer = rawAudio;
        } else if (rawAudio instanceof Uint8Array) {
          finalAudioBuffer = Buffer.from(rawAudio);
        } else {
          console.log('⚠️ Unknown raw audio format, trying to convert...');
          finalAudioBuffer = Buffer.from(rawAudio);
        }
      } else {
        console.log('⚠️ Raw audio too small or invalid, trying base64 method...');
        
        // Method 2: Try base64 if raw fails
        const base64Audio = tts.toBase64();
        if (base64Audio && base64Audio.length > 100) {
          console.log('🔄 Converting base64 to buffer...');
          finalAudioBuffer = Buffer.from(base64Audio, 'base64');
        }
      }
    } catch (rawError) {
      console.error('Raw audio extraction failed:', rawError);
      
      // Fallback: Try base64 method
      try {
        console.log('🔄 Falling back to base64 method...');
        const base64Audio = tts.toBase64();
        if (base64Audio && base64Audio.length > 100) {
          finalAudioBuffer = Buffer.from(base64Audio, 'base64');
        }
      } catch (base64Error) {
        console.error('Base64 audio extraction also failed:', base64Error);
        throw new Error('Failed to extract audio data using any method');
      }
    }
    
    // Validate that we actually have binary audio data, not JSON or text
    if (!finalAudioBuffer || finalAudioBuffer.length < 1000) {
      throw new Error(`Audio data too small or invalid: ${finalAudioBuffer?.length || 0} bytes`);
    }

    // Check if the buffer starts with text/JSON content (common issue)
    const bufferStart = finalAudioBuffer.slice(0, 50).toString('utf8');
    if (bufferStart.includes('{') || bufferStart.includes('art') || bufferStart.includes('context')) {
      console.error('❌ Buffer contains text/JSON instead of audio data:', bufferStart);
      throw new Error('Invalid audio data - received text instead of binary audio');
    }

    console.log(`✅ Audio generated successfully, final size: ${finalAudioBuffer.length} bytes`);
    console.log(`📊 Audio buffer type: ${typeof finalAudioBuffer}, constructor: ${finalAudioBuffer.constructor.name}`);

    // Detect audio format from the first few bytes
    let contentType = 'audio/wav'; // default
    if (finalAudioBuffer.length >= 4) {
      const header = finalAudioBuffer.slice(0, 4);
      
      if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
        contentType = 'audio/webm';
        console.log('🎵 Detected WebM audio format');
      } else if (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) {
        contentType = 'audio/mpeg';
        console.log('🎵 Detected MP3 audio format');
      } else if (header.toString('utf8').startsWith('RIFF')) {
        contentType = 'audio/wav';
        console.log('🎵 Detected WAV audio format');
      } else {
        console.log('🎵 Unknown audio format, using default audio/wav');
      }
    }

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': contentType,
      'Content-Length': finalAudioBuffer.length,
      'Content-Disposition': 'inline; filename="speech.wav"',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    // Send the audio buffer
    res.send(finalAudioBuffer);

  } catch (error) {
    console.error('❌ Synthesis error:', error);
    res.status(500).json({
      success: false,
      error: 'Speech synthesis failed',
      message: error.message
    });
  }
});

// Text-to-speech synthesis endpoint (returns base64)
app.post('/api/synthesize/base64', async (req, res) => {
  try {
    const { 
      text, 
      voice = 'en-US-AriaNeural', 
      rate = '0%', 
      volume = '0%', 
      pitch = '0Hz'
    } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    console.log(`🎤 Synthesizing text to base64 with voice: ${voice}`);

    // Create fresh EdgeTTS instance for base64 synthesis
    const tts = new EdgeTTS();
    
    // Synthesize the speech
    await tts.synthesize(text, voice, {
      rate,
      volume,
      pitch
    });

    // Get audio as base64 with validation
    let base64Audio = null;
    
    try {
      base64Audio = tts.toBase64();
      
      if (!base64Audio || base64Audio.length < 100) {
        console.log('⚠️ Base64 audio too small, trying raw method...');
        
        // Fallback: try raw and convert to base64
        const rawAudio = await tts.toRaw();
        if (rawAudio && rawAudio.length > 1000) {
          const buffer = Buffer.isBuffer(rawAudio) ? rawAudio : Buffer.from(rawAudio);
          base64Audio = buffer.toString('base64');
        }
      }
    } catch (error) {
      console.error('❌ Base64 audio extraction failed, trying raw method:', error);
      
      // Fallback to raw conversion
      const rawAudio = await tts.toRaw();
      if (rawAudio && rawAudio.length > 1000) {
        const buffer = Buffer.isBuffer(rawAudio) ? rawAudio : Buffer.from(rawAudio);
        base64Audio = buffer.toString('base64');
      }
    }
    
    if (!base64Audio || base64Audio.length < 100) {
      throw new Error(`Base64 audio data invalid or too small: ${base64Audio?.length || 0} characters`);
    }

    console.log(`✅ Base64 audio generated successfully, length: ${base64Audio.length} characters`);

    res.json({
      success: true,
      audio: base64Audio,
      format: 'audio/wav',
      voice: voice,
      textLength: text.length
    });

  } catch (error) {
    console.error('❌ Synthesis error:', error);
    res.status(500).json({
      success: false,
      error: 'Speech synthesis failed',
      message: error.message
    });
  }
});

// Batch synthesis endpoint
app.post('/api/synthesize/batch', async (req, res) => {
  try {
    const { 
      texts, 
      voice = 'en-US-AriaNeural', 
      rate = '0%', 
      volume = '0%', 
      pitch = '0Hz'
    } = req.body;

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({
        success: false,
        error: 'Texts array is required'
      });
    }

    console.log(`🎤 Batch synthesizing ${texts.length} texts with voice: ${voice}`);

    const results = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      
      try {
        // Create fresh EdgeTTS instance for each batch item
        const tts = new EdgeTTS();
        await tts.synthesize(text, voice, { rate, volume, pitch });
        const base64Audio = tts.toBase64();
        
        results.push({
          index: i,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          audio: base64Audio,
          success: true
        });
        
        console.log(`✅ Synthesized text ${i + 1}/${texts.length}`);
        
      } catch (error) {
        console.error(`❌ Failed to synthesize text ${i + 1}:`, error);
        results.push({
          index: i,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      count: results.length,
      results: results
    });

  } catch (error) {
    console.error('❌ Batch synthesis error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch synthesis failed',
      message: error.message
    });
  }
});

// Test endpoint for validating audio generation
app.post('/api/test', async (req, res) => {
  try {
    const testText = "Hello, this is a test of the Edge TTS service.";
    const voice = 'en-US-AriaNeural';
    
    console.log('🧪 Running test synthesis...');
    
    // Create fresh EdgeTTS instance for test
    const tts = new EdgeTTS();
    await tts.synthesize(testText, voice);
    
    // Test both methods
    const rawAudio = await tts.toRaw();
    const base64Audio = tts.toBase64();
    
    const results = {
      success: true,
      testText,
      voice,
      rawAudioSize: rawAudio ? (Buffer.isBuffer(rawAudio) ? rawAudio.length : rawAudio.length) : 0,
      base64AudioSize: base64Audio ? base64Audio.length : 0,
      rawAudioValid: rawAudio && (Buffer.isBuffer(rawAudio) ? rawAudio.length : rawAudio.length) > 1000,
      base64AudioValid: base64Audio && base64Audio.length > 100,
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 Test results:', results);
    res.json(results);
    
  } catch (error) {
    console.error('❌ Test synthesis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Test synthesis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/voices',
      'POST /api/synthesize',
      'POST /api/synthesize/base64',
      'POST /api/synthesize/batch'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🎤 Edge TTS Service starting...');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🎙️ API endpoints:`);
  console.log(`   GET  /api/voices - Get available voices`);
  console.log(`   POST /api/synthesize - Synthesize speech (binary audio)`);
  console.log(`   POST /api/synthesize/base64 - Synthesize speech (base64)`);
  console.log(`   POST /api/synthesize/batch - Batch synthesis`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Edge TTS Service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Edge TTS Service...');
  process.exit(0);
});
