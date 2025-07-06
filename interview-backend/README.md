# AI Interview Backend

A Node.js backend server for conducting AI-powered technical interviews with real-time code execution and audio responses.

## Features

- **AI-Powered Interviews**: Uses Groq AI for intelligent interview conversations
- **Text-to-Speech**: ElevenLabs integration for audio responses from the AI interviewer
- **Real-time Code Execution**: Secure code execution with multiple language support
- **Phase-Aware Interviewing**: Adaptive interview flow based on candidate responses
- **WebSocket Communication**: Real-time bidirectional communication with frontend

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Required API Keys**
   - `GROQ_API_KEY`: Get from [Groq Console](https://console.groq.com/)
   - `ELEVENLABS_API_KEY`: Get from [ElevenLabs](https://elevenlabs.io) (optional, for TTS)

4. **Start Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Test Integration**
   ```bash
   node test-tts-integration.js
   ```

## Environment Variables

```env
# Server
INTERVIEW_PORT=5001
FRONTEND_URL=http://localhost:5173

# AI Services
GROQ_API_KEY=your_groq_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Security
MAX_EXECUTION_TIME=10000
MAX_CODE_LENGTH=50000
SESSION_TIMEOUT=1800000
```

## Features in Detail

### 🤖 AI Interview Flow
- Adaptive conversation flow based on candidate responses
- Context-aware phase transitions (introduction → problem → coding → testing → conclusion)
- Intelligent hint generation and evaluation

### 🔊 Text-to-Speech Integration
- Professional AI voice responses using ElevenLabs
- Automatic text cleaning for optimal speech quality
- Fallback to text-only if TTS unavailable
- See [ELEVENLABS_TTS_INTEGRATION.md](./ELEVENLABS_TTS_INTEGRATION.md) for details

### 💻 Code Execution
- Secure sandboxed code execution
- Support for JavaScript, Python, C++, and more
- Real-time test case validation
- Code progress monitoring

### 🔄 Real-time Communication
- WebSocket-based communication
- Live code synchronization
- Progress tracking and encouragement
- Session management with timeouts

## API Endpoints

### WebSocket Events

#### Client → Server
- `join-interview`: Start interview session
- `candidate-message`: Send message to AI
- `code-update`: Update code in real-time
- `execute-code`: Run code and tests
- `request-hint`: Ask for coding hint
- `end-interview`: Complete interview

#### Server → Client
- `interview-started`: Interview session initialized
- `interviewer-response`: AI response with optional audio
- `gentle-encouragement`: Supportive hints during coding
- `execution-results`: Code execution results
- `interview-completed`: Final evaluation and summary

## File Structure

```
interview-backend/
├── services/
│   ├── GroqService.js          # AI conversation and TTS
│   ├── InterviewManager.js     # Session management
│   ├── ProblemService.js       # Coding problems
│   └── CodeExecutionService.js # Code runner
├── server.js                   # Main server
├── package.json
└── .env.example
```

## Development

### Testing TTS Integration
```bash
node test-tts-integration.js
```

### Starting Development Server
```bash
npm run dev
```

### Debugging
Set `NODE_ENV=development` for detailed logging.

## Security Features

- Helmet.js security headers
- CORS configuration
- Rate limiting
- Sandboxed code execution
- Input validation and sanitization

## Performance

- Session timeout management
- Code execution limits
- Memory usage monitoring
- Audio generation optimization

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## License

MIT License - see LICENSE file for details.
