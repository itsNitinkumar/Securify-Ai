import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Send } from 'lucide-react';

const SentinelChat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m Sentinel AI. Ask me anything about your security findings, reports, or activity logs.',
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages([
      ...messages,
      { role: 'user', content: message },
      {
        role: 'assistant',
        content: 'I\'m analyzing your query. This is a demo response. In production, I would provide intelligent insights based on your security data.',
      },
    ]);
    setMessage('');
  };

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline h-[600px] flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-outline-variant">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-on-surface">Sentinel AI Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-surface'
                  : 'bg-surface border border-outline-variant text-on-surface'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Sentinel..."
          className="flex-1 px-3 py-2 bg-surface border border-outline rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          className="bg-primary text-surface hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default SentinelChat;
