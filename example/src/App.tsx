import { useEffect, useState } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;

interface Message {
  time: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
}

function App() {
  // Check if VAPI_PUBLIC_KEY is available
  if (!VAPI_PUBLIC_KEY) {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '50px auto', 
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px'
      }}>
        <h1 style={{ color: '#dc2626' }}>⚠️ Configuration Required</h1>
        <p style={{ color: '#7f1d1d', lineHeight: '1.6' }}>
          The VAPI public key is not configured. Please add the <code>VITE_VAPI_PUBLIC_KEY</code> 
          environment variable to your deployment settings.
        </p>
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '15px', 
          borderRadius: '4px', 
          marginTop: '20px',
          textAlign: 'left'
        }}>
          <p><strong>For Vercel:</strong></p>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Go to your project settings in Vercel dashboard</li>
            <li>Navigate to Environment Variables</li>
            <li>Add: <code>VITE_VAPI_PUBLIC_KEY</code> = your Vapi public key</li>
            <li>Redeploy your application</li>
          </ol>
        </div>
      </div>
    );
  }

  const [vapi] = useState(() => new Vapi(VAPI_PUBLIC_KEY));
  const [connected, setConnected] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [customSayText, setCustomSayText] = useState('');
  const [interruptionsEnabled, setInterruptionsEnabled] = useState(true);
  const [interruptAssistantEnabled, setInterruptAssistantEnabled] = useState(true);
  const [endCallAfterSay, setEndCallAfterSay] = useState(false);

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // Set up Vapi event listeners
    vapi.on('call-start', () => {
      console.log('Call started');
      setConnected(true);
      addMessage('system', 'Call connected');
    });

    vapi.on('call-end', () => {
      console.log('Call ended');
      setConnected(false);
      setAssistantIsSpeaking(false);
      setVolumeLevel(0);
      addMessage('system', 'Call ended');
    });

    vapi.on('speech-start', () => {
      console.log('Assistant started speaking');
      setAssistantIsSpeaking(true);
    });

    vapi.on('speech-end', () => {
      console.log('Assistant stopped speaking');
      setAssistantIsSpeaking(false);
    });

    vapi.on('volume-level', (volume) => {
      setVolumeLevel(volume);
    });

    vapi.on('message', (message) => {
      console.log('Received message:', message);
      
      // Handle different message types
      if (message.type === 'transcript') {
        if (message.transcriptType === 'final') {
          if (message.role === 'user') {
            addMessage('user', message.transcript);
          } else if (message.role === 'assistant') {
            addMessage('assistant', message.transcript);
          }
        }
      } else if (message.type === 'function-call') {
        addMessage('system', `Function called: ${message.functionCall.name}`);
      } else if (message.type === 'hang') {
        addMessage('system', 'Call ended by assistant');
      }
    });

    vapi.on('error', (error) => {
      console.error('Vapi error:', error);
      addMessage('system', `Error: ${error.message || error}`);
    });

    return () => {
      clearInterval(timer);
      vapi.stop();
    };
  }, [vapi]);

  const addMessage = (type: 'user' | 'assistant' | 'system', content: string) => {
    setMessages(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      type,
      content
    }]);
  };

  const startCall = async () => {
    try {
      addMessage('system', 'Starting call...');
      
      // Start call with your existing assistant ID
      await vapi.start('dc0da3fb-4b7e-4bd4-8778-71c934fc64a5');
      
    } catch (error) {
      console.error('Error starting call:', error);
      addMessage('system', `Failed to start call: ${error}`);
    }
  };

  const stopCall = () => {
    vapi.stop();
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    vapi.setMuted(newMutedState);
    setIsMuted(newMutedState);
    addMessage('system', newMutedState ? 'Microphone muted' : 'Microphone unmuted');
  };

  const sendMessage = () => {
    // Example of sending a background message to the assistant
    vapi.send({
      type: "add-message",
      message: {
        role: "system",
        content: "The user has indicated they want to change topics."
      }
    });
    addMessage('system', 'Background message sent to assistant');
  };

  const handleManualSay = (text: string, endCallAfter: boolean = false) => {
    if (!connected || !text.trim()) return;
    
    try {
      // Use the full say() method signature with all 4 parameters
      vapi.say(text, endCallAfter, interruptionsEnabled, interruptAssistantEnabled);
      
      const statusParts = [
        `Manual say: "${text}"`,
        endCallAfter ? 'end call after' : null,
        `interrupt user: ${interruptionsEnabled ? 'enabled' : 'disabled'}`,
        `interrupt assistant: ${interruptAssistantEnabled ? 'enabled' : 'disabled'}`
      ].filter(Boolean);
      
      addMessage('system', statusParts.join(' | '));
    } catch (error) {
      console.error('Error with manual say:', error);
      addMessage('system', `Error with manual say: ${error}`);
    }
  };

  const handleCustomSay = () => {
    if (customSayText.trim()) {
      handleManualSay(customSayText, endCallAfterSay);
      setCustomSayText('');
    }
  };

  const handlePresetSay = (text: string) => {
    handleManualSay(text, endCallAfterSay);
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Avishkar AI Voice Demo App</h1>
      
      {/* Status Panel */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Status:</strong> 
            <span style={{ 
              color: connected ? '#22c55e' : '#ef4444',
              marginLeft: '8px'
            }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div>Current Time: {currentTime}</div>
        </div>
        
        {connected && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div>
                <strong>Assistant:</strong> 
                <span style={{ color: assistantIsSpeaking ? '#f59e0b' : '#6b7280', marginLeft: '8px' }}>
                  {assistantIsSpeaking ? 'Speaking' : 'Listening'}
                </span>
              </div>
              <div>
                <strong>Volume:</strong> 
                <span style={{ marginLeft: '8px' }}>{Math.round(volumeLevel * 100)}%</span>
              </div>
              <div>
                <strong>Mic:</strong> 
                <span style={{ 
                  color: isMuted ? '#ef4444' : '#22c55e',
                  marginLeft: '8px'
                }}>
                  {isMuted ? 'Muted' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <button 
          onClick={startCall} 
          disabled={connected}
          style={{
            padding: '12px 24px',
            backgroundColor: connected ? '#9ca3af' : '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: connected ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          Start Call
        </button>
        
        <button 
          onClick={stopCall} 
          disabled={!connected}
          style={{
            padding: '12px 24px',
            backgroundColor: !connected ? '#9ca3af' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !connected ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          Stop Call
        </button>
        
        <button 
          onClick={toggleMute} 
          disabled={!connected}
          style={{
            padding: '12px 24px',
            backgroundColor: !connected ? '#9ca3af' : (isMuted ? '#f59e0b' : '#3b82f6'),
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !connected ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        
        <button 
          onClick={sendMessage} 
          disabled={!connected}
          style={{
            padding: '12px 24px',
            backgroundColor: !connected ? '#9ca3af' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !connected ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          Send Context
        </button>
      </div>

      {/* Manual Say Controls */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#374151' }}>Manual Say Controls</h3>
        
        {/* Configuration Toggles */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginBottom: '15px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={endCallAfterSay}
              onChange={(e) => setEndCallAfterSay(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#16a34a', fontWeight: '500' }}>End Call After Speaking ✓</span>
          </label>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px'
          }}>
            <input
              type="checkbox"
              checked={interruptionsEnabled}
              onChange={(e) => setInterruptionsEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#16a34a', fontWeight: '500' }}>User Interruptions Enabled ✓</span>
          </label>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px'
          }}>
            <input
              type="checkbox"
              checked={interruptAssistantEnabled}
              onChange={(e) => setInterruptAssistantEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#16a34a', fontWeight: '500' }}>Interrupt Assistant ✓</span>
          </label>
        </div>

        {/* Custom Say Input */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={customSayText}
              onChange={(e) => setCustomSayText(e.target.value)}
              placeholder="Enter custom text for assistant to say..."
              disabled={!connected}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomSay()}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: !connected ? '#f3f4f6' : 'white'
              }}
            />
            <button
              onClick={handleCustomSay}
              disabled={!connected || !customSayText.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: (!connected || !customSayText.trim()) ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (!connected || !customSayText.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Say It
            </button>
          </div>
        </div>

        {/* Preset Messages */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b7280' }}>Quick Preset Messages:</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              "Hello, how are you doing today?",
              "Let me think about that for a moment.",
              "That's a great question! Here's what I think:",
              "I understand your concern. Let me explain.",
              "Thank you for your patience.",
              "Is there anything else I can help you with?",
              "Our time is up. Thank you for the conversation, goodbye!"
            ].map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  // Special handling for goodbye message - force end call
                  if (preset.includes("goodbye")) {
                    handleManualSay(preset, true);
                  } else {
                    handlePresetSay(preset);
                  }
                }}
                disabled={!connected}
                style={{
                  padding: '8px 12px',
                  backgroundColor: !connected ? '#f3f4f6' : 
                    (preset.includes("goodbye") ? '#fee2e2' : '#e0e7ff'),
                  color: !connected ? '#9ca3af' : 
                    (preset.includes("goodbye") ? '#dc2626' : '#3730a3'),
                  border: `1px solid ${preset.includes("goodbye") ? '#fecaca' : '#c7d2fe'}`,
                  borderRadius: '4px',
                  cursor: !connected ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  maxWidth: '200px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={preset + (preset.includes("goodbye") ? " (Will end call)" : "")}
              >
                {preset}{preset.includes("goodbye") ? " 🔚" : ""}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Conversation Display */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Conversation</h3>
        
        {messages.length === 0 ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
            No messages yet. Start a call to begin the conversation.
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              style={{ 
                marginBottom: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 
                  message.type === 'user' ? '#dbeafe' :
                  message.type === 'assistant' ? '#dcfce7' : '#f3f4f6'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ 
                  fontWeight: 'bold',
                  color: 
                    message.type === 'user' ? '#1d4ed8' :
                    message.type === 'assistant' ? '#16a34a' : '#6b7280'
                }}>
                  {message.type === 'user' ? 'You' : 
                   message.type === 'assistant' ? 'Assistant' : 'System'}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {message.time}
                </span>
              </div>
              <div style={{ color: '#374151' }}>
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Usage Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <h4 style={{ marginTop: 0 }}>How to use:</h4>
        <ul style={{ marginBottom: 0 }}>
          <li>Click "Start Call" to begin a voice conversation</li>
          <li>Speak naturally - the AI will respond with voice</li>
          <li>Use "Mute" to temporarily disable your microphone</li>
          <li>Say "goodbye" or "end call" to end the conversation</li>
          <li>Click "Stop Call" to manually end the call</li>
        </ul>
      </div>
    </div>
  );
}

export default App; 