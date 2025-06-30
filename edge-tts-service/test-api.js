import { EdgeTTS } from '@andresaya/edge-tts';

async function testAPI() {
  try {
    console.log('Testing @andresaya/edge-tts API...');
    
    // Try creating instance
    const tts = new EdgeTTS();
    console.log('TTS instance created successfully');
    console.log('TTS instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(tts)));
    
    // Test getVoices
    console.log('Getting voices...');
    const voices = await tts.getVoices();
    console.log(`Found ${voices.length} voices`);
    if (voices.length > 0) {
      console.log('First voice:', voices[0]);
    }
    
    // Test synthesis
    console.log('Testing synthesis...');
    const text = "Hello, this is a test message.";
    const voice = "en-US-AriaNeural";
    
    const audioData = await tts.synthesize(text, voice);
    console.log('Synthesis result type:', typeof audioData);
    console.log('Synthesis result length:', audioData?.length || 'N/A');
    
    console.log('API test completed successfully');
  } catch (error) {
    console.error('API test failed:', error);
  }
}

testAPI();
