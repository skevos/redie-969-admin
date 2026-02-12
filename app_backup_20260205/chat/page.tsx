'use client'
import { useState, useEffect, useRef } from 'react'

interface Message {
  id: number
  user: string
  text: string
  time: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, user: 'DJ Mike', text: 'Καλησπέρα σε όλους!', time: '20:01' },
    { id: 2, user: 'Listener1', text: 'Παίξε κάτι rock!', time: '20:02' },
    { id: 3, user: 'Maria', text: 'Τέλειο το τραγούδι! 🎵', time: '20:03' },
  ])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sendMessage = () => {
    if (!newMessage.trim()) return
    const msg: Message = {
      id: Date.now(),
      user: 'Admin',
      text: newMessage,
      time: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages([...messages, msg])
    setNewMessage('')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">💬 Live Chat</h1>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
            <span className="font-bold">Live Chat Room</span>
            <span className="text-green-400 text-sm">● {messages.length} messages</span>
          </div>
          
          <div className="h-96 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {msg.user[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-red-400">{msg.user}</span>
                    <span className="text-gray-500 text-xs">{msg.time}</span>
                  </div>
                  <p className="text-gray-300">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t border-gray-700 p-4 flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type message..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2"
            />
            <button
              onClick={sendMessage}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
