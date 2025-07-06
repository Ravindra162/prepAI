import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testEdgeTTSService() {
  console.log('🧪 Testing Edge TTS Service...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);

    // Test 2: Get voices
    console.log('\n2️⃣ Testing voices endpoint...');
    const voicesResponse = await fetch(`${BASE_URL}/api/voices`);
    const voicesData = await voicesResponse.json();
    console.log(`✅ Retrieved ${voicesData.count} voices`);
    console.log('📋 Sample voices:');
    voicesData.voices.slice(0, 5).forEach(voice => {
      console.log(`   - ${voice.displayName} (${voice.name})`);
    });

    // Test 3: Synthesize speech (base64)
    console.log('\n3️⃣ Testing speech synthesis...');
    const synthesizeResponse = await fetch(`${BASE_URL}/api/synthesize/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Hello! This is a test of the Edge TTS service. The voice quality should be excellent.',
        voice: 'en-US-AriaNeural',
        rate: '0%',
        volume: '0%',
        pitch: '0Hz'
      })
    });

    const synthesizeData = await synthesizeResponse.json();
    if (synthesizeData.success) {
      console.log('✅ Speech synthesis successful');
      console.log(`📊 Audio data length: ${synthesizeData.audio.length} characters (base64)`);
      console.log(`🎤 Voice used: ${synthesizeData.voice}`);
    } else {
      console.log('❌ Speech synthesis failed:', synthesizeData.error);
    }

    // Test 4: Batch synthesis
    console.log('\n4️⃣ Testing batch synthesis...');
    const batchResponse = await fetch(`${BASE_URL}/api/synthesize/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        texts: [
          'First test message',
          'Second test message',
          'Third test message'
        ],
        voice: 'en-US-JennyNeural'
      })
    });

    const batchData = await batchResponse.json();
    if (batchData.success) {
      console.log(`✅ Batch synthesis successful: ${batchData.count} items`);
      batchData.results.forEach((result, index) => {
        if (result.success) {
          console.log(`   ✅ Item ${index + 1}: ${result.text}`);
        } else {
          console.log(`   ❌ Item ${index + 1}: ${result.error}`);
        }
      });
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the Edge TTS service is running:');
    console.log('   cd edge-tts-service && npm run dev');
  }
}

// Run tests
testEdgeTTSService();
