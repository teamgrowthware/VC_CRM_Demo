'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, Send, Search, MessageCircle } from 'lucide-react';
import { getMyChatRooms, getMessagesByRoom, sendMessage, ChatRoom, Message, memberDisplayName } from '@/lib/api/chat';
import { useSocket } from '@/components/providers/SocketProvider';

export default function ClientChat() {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeRoomId = activeRoom?.id;

  const clientUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('clientUser') || '{}') : {};

  useEffect(() => {
    getMyChatRooms()
      .then((data) => {
        const filtered = data.filter(r => !r.isDeleted);
        setRooms(filtered);
        if (filtered.length > 0) {
          setActiveRoom(filtered[0]);
        }
      })
      .catch(() => setError('Unable to load your chats. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;
    getMessagesByRoom(activeRoomId, 50)
      .then(setMessages)
      .catch(() => setError('Unable to load messages for this chat. Please try again.'));
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket || !activeRoomId) return;
    const handleNewMessage = (msg: Message) => {
      if (msg.roomId === activeRoomId) {
        setMessages(prev => [...prev, msg]);
      }
      setRooms(prev => prev.map(r => r.id === msg.roomId ? { ...r, updatedAt: msg.createdAt } : r));
    };
    socket.on('receiveMessage', handleNewMessage);
    return () => { socket.off('receiveMessage', handleNewMessage); };
  }, [socket, activeRoomId]);

  const handleSend = async () => {
    if (!input.trim() || !activeRoom || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendMessage(activeRoom.id, content);
    } catch (e) {
      console.error(e);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const filteredRooms = rooms.filter(r => {
    if (!search) return true;
    const name = r.name || r.members?.map(m => memberDisplayName(m)).join(', ') || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const roomDisplayName = (room: ChatRoom) => {
    if (room.name) return room.name;
    const otherMembers = room.members?.filter(m => !m.clientId) || [];
    return otherMembers.map(m => memberDisplayName(m)).join(', ') || 'Chat';
  };

  const roomLastMessage = (room: ChatRoom) => {
    const last = room.messages?.[room.messages.length - 1];
    if (!last) return 'No messages yet';
    const sender = last.sender?.name || last.senderClient?.name || 'Unknown';
    return `${sender}: ${last.content}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl overflow-hidden flex">
      <div className={`w-80 border-r border-border flex flex-col ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground mb-3">Chats</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {error || 'No chats found'}
            </div>
          ) : (
            filteredRooms.map(room => (
              <button
                key={room.id}
                onClick={() => { setActiveRoom(room); }}
                className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 ${
                  activeRoom?.id === room.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="text-sm font-medium text-foreground truncate">{roomDisplayName(room)}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{roomLastMessage(room)}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!activeRoom ? 'hidden md:flex' : 'flex'}`}>
        {!activeRoom ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a chat to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <button
                onClick={() => setActiveRoom(null)}
                className="md:hidden text-muted-foreground hover:text-foreground text-sm"
              >
                Back
              </button>
              <div>
                <div className="text-sm font-semibold text-foreground">{roomDisplayName(activeRoom)}</div>
                <div className="text-xs text-muted-foreground">{activeRoom.members?.length || 0} members</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</div>
              )}
              {messages.map(msg => {
                const isMe = msg.senderClientId === clientUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}>
                      {!isMe && (
                        <div className="text-[10px] font-medium opacity-70 mb-1">
                          {msg.sender?.name || msg.senderClient?.name}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      <div className={`text-[10px] mt-1 ${isMe ? 'opacity-70' : 'text-muted-foreground'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-6 py-4 border-t border-border">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="p-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
