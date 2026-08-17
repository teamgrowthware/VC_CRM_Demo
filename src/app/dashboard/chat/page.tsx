"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSocket } from '@/components/providers/SocketProvider';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getMyChatRooms, getMessagesByRoom, sendMessage, uploadChatFile, ChatRoom, Message } from '@/lib/api/chat';
import { API_URL } from '@/lib/api/apiClient';
import { fetchEmployees } from '@/lib/api/employee';
import { Employee } from '@/types/employee';
import { useAuth } from '@/hooks/useAuth';
import { 
  Send, 
  Paperclip, 
  MessageSquare, 
  Users, 
  Hash, 
  Search, 
  Plus,
  MoreVertical,
  FileText,
  Star,
  Pin,
  BellOff,
  ChevronDown,
  Settings2
} from 'lucide-react';
import NewChatModal from '@/components/chat/NewChatModal';
import GroupInfoModal from '@/components/chat/GroupInfoModal';

type ChatTab = 'All' | 'Unread' | 'Priority' | 'Direct' | 'Groups' | 'Mentions' | 'Archived';
const TABS: ChatTab[] = ['All', 'Unread', 'Priority', 'Direct', 'Groups', 'Mentions', 'Archived'];

export default function ChatPage() {
  const { socket } = useSocket();
  const { user: currentUser } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  
  const [activeTab, setActiveTab] = useState<ChatTab>('All');
  const [activeFilter, setActiveFilter] = useState<string>('All Chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const refreshRooms = useCallback(async () => {
    try {
      const roomsData = await getMyChatRooms();
      setRooms(roomsData);
      setActiveRoom(prev => {
        if (!prev) return prev;
        const updated = roomsData.find(r => r.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      
      setRooms(prev => prev.map(room => {
        if (room.id === msg.roomId) {
          return { ...room, messages: [msg] };
        }
        return room;
      }));
    };

    const handleTypingStart = ({ userName }: { userName: string }) => {
      setTypingUsers(prev => {
        if (!prev.includes(userName)) return [...prev, userName];
        return prev;
      });
    };

    const handleTypingStop = ({ userName }: { userName: string }) => {
      setTypingUsers(prev => prev.filter(name => name !== userName));
    };

    const handleRoomDeleted = (data: { roomId: string }) => {
      setRooms(prev => prev.filter(r => r.id !== data.roomId));
      setActiveRoom(prev => (prev?.id === data.roomId ? null : prev));
      setShowRoomInfo(false);
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typingStart', handleTypingStart);
    socket.on('typingStop', handleTypingStop);
    socket.on('roomUpdated', refreshRooms);
    socket.on('memberAdded', refreshRooms);
    socket.on('memberRemoved', refreshRooms);
    socket.on('roomDeleted', handleRoomDeleted);
    socket.on('roomRestored', refreshRooms);

    const currentActiveRoomId = activeRoomIdRef.current;
    if (currentActiveRoomId) {
      socket.emit('joinRoom', currentActiveRoomId);
    }

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typingStart', handleTypingStart);
      socket.off('typingStop', handleTypingStop);
      socket.off('roomUpdated', refreshRooms);
      socket.off('memberAdded', refreshRooms);
      socket.off('memberRemoved', refreshRooms);
      socket.off('roomDeleted', handleRoomDeleted);
      socket.off('roomRestored', refreshRooms);
    };
  }, [socket, refreshRooms]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, empsData, clientsData] = await Promise.all([
          getMyChatRooms(),
          fetchEmployees(),
          fetch('/api/client/me').then(res => res.json()).catch(() => ({ data: [] })) // Dummy mock fetching for clients
        ]);
        setRooms(roomsData);
        setEmployees(empsData);
        // Fallback dummy clients if endpoint fails/empty
        setClients(clientsData?.data?.length ? clientsData.data : [
          { id: 'client1', name: 'Acme Corp', clientId: 'CL-001', email: 'contact@acmecorp.com' },
          { id: 'client2', name: 'Globex Inc', clientId: 'CL-002', email: 'hello@globex.com' }
        ]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeRoom && socket) {
      activeRoomIdRef.current = activeRoom.id;
      
      socket.emit('joinRoom', activeRoom.id);
      
      getMessagesByRoom(activeRoom.id, 50).then(data => {
        setMessages(data);
        setHasMore(data.length === 50);
        lastMessageIdRef.current = null;
      });

      import('@/lib/api/chat').then(({ updateChatPreferences }) => {
         updateChatPreferences(activeRoom.id, { lastReadAt: new Date().toISOString() }).catch(console.error);
         
         setRooms(prev => prev.map(r => {
            if (r.id === activeRoom.id) {
               const memberIndex = r.members.findIndex(m => m.employeeId === currentUser?.id);
               if (memberIndex !== -1) {
                  const newMembers = [...r.members];
                  newMembers[memberIndex] = { ...newMembers[memberIndex], lastReadAt: new Date().toISOString() };
                  return { ...r, members: newMembers };
               }
            }
            return r;
         }));
      });

      return () => {
        socket.emit('leaveRoom', activeRoom.id);
        activeRoomIdRef.current = null;
      };
    }
  }, [activeRoom, socket, currentUser]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = last.id;
      if (!isLoadingMore && scrollContainerRef.current) {
        rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
      }
    }
  }, [messages, isLoadingMore, rowVirtualizer]);

  const fetchMoreMessages = useCallback(async () => {
    if (!activeRoom || isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);
    
    try {
      const cursor = messages[0].id;
      const olderMessages = await getMessagesByRoom(activeRoom.id, 50, cursor);
      
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setHasMore(olderMessages.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load older messages', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeRoom, isLoadingMore, hasMore, messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0) {
      fetchMoreMessages();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      const content = inputMessage;
      const file = fileInputRef.current?.files?.[0];
      if (!content.trim() && !file) return;
      if (!activeRoom || !currentUser) return;

      socket?.emit('typingStop', { roomId: activeRoom.id, userName: currentUser.name });
      
      try {
         let fileUrl = undefined;
         let fileType = undefined;

         if (file) {
            const uploadRes = await uploadChatFile(file);
            fileUrl = uploadRes.url;
            fileType = uploadRes.type;
            if (fileInputRef.current) fileInputRef.current.value = '';
         }

         setInputMessage('');

         const res = await sendMessage(activeRoom.id, content, undefined, fileUrl, fileType);
         if (res?.newMessage) {
            setMessages(prev => prev.some(m => m.id === res.newMessage.id) ? prev : [...prev, res.newMessage]);
            setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, messages: [res.newMessage] } : r));
         }
      } catch (error) {
         console.error(error);
      }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
     setInputMessage(e.target.value);
     
     if (!activeRoom || !socket || !currentUser) return;
     
     if (!isTyping) {
        setIsTyping(true);
        socket.emit('typingStart', { roomId: activeRoom.id, userName: currentUser.name });
     }
     
     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
     
     typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typingStop', { roomId: activeRoom.id, userName: currentUser.name });
     }, 1000);
  };

  const getRoomName = useCallback((room: ChatRoom) => {
    if (room.name) return room.name;
    const otherMember = room.members.find(m => m.employeeId !== currentUser?.id && m.clientId !== currentUser?.id);
    return otherMember ? (otherMember.employee?.name || otherMember.client?.name || 'Unknown') : 'Unknown User';
  }, [currentUser]);

  const myMemberInfo = useCallback((room: ChatRoom) => room.members.find(m => m.employeeId === currentUser?.id || m.clientId === currentUser?.id), [currentUser]);

  const groupFilterNames = useMemo(() => {
    const names = rooms.filter(r => r.type !== 'PERSONAL' && r.name).map(r => r.name!);
    return Array.from(new Set(names));
  }, [rooms]);
  const FILTERS = ['All Chats', 'My Groups', ...groupFilterNames];

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const member = myMemberInfo(room);
      if (!member) return false;

      const searchMatch = getRoomName(room).toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) return false;

      if (activeTab === 'Archived' && !room.isArchived) return false;
      if (activeTab !== 'Archived' && room.isArchived) return false;
      
      if (activeTab === 'Priority' && member.priority !== 'HIGH') return false;
      if (activeTab === 'Direct' && room.type !== 'PERSONAL') return false;
      if (activeTab === 'Groups' && room.type === 'PERSONAL') return false;
      if (activeTab === 'Unread') {
         const lastMsgTime = room.messages?.[0] ? new Date(room.messages[0].createdAt).getTime() : 0;
         const readTime = member.lastReadAt ? new Date(member.lastReadAt).getTime() : 0;
         if (lastMsgTime <= readTime && room.messages?.length > 0) return false;
         if (room.messages?.length === 0) return false;
      }

      if (activeFilter !== 'All Chats') {
        if (activeFilter === 'My Groups') {
          if (room.type === 'PERSONAL') return false;
        } else {
          if (room.name !== activeFilter) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const m1 = myMemberInfo(a);
      const m2 = myMemberInfo(b);
      if (m1?.isPinned && !m2?.isPinned) return -1;
      if (!m1?.isPinned && m2?.isPinned) return 1;
      if (m1?.priority === 'HIGH' && m2?.priority !== 'HIGH') return -1;
      if (m1?.priority !== 'HIGH' && m2?.priority === 'HIGH') return 1;

      const aTime = a.messages?.[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
      const bTime = b.messages?.[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
      return bTime - aTime;
    });
    }, [rooms, searchQuery, activeTab, activeFilter, getRoomName, myMemberInfo]);

  const handleLeaveRoom = (roomId: string) => {
    socket?.emit('leaveRoom', roomId);
    setRooms(prev => prev.filter(r => r.id !== roomId));
    setActiveRoom(prev => (prev?.id === roomId ? null : prev));
    setShowRoomInfo(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-[#0a0a0a]">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
           <div className="flex items-center justify-between mb-4">
             <h2 className="font-semibold text-lg flex items-center gap-2">
               <MessageSquare className="w-5 h-5" />
               Team Chat
             </h2>
             <button 
               onClick={() => setShowNewChat(true)}
               className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
               title="New chat / group"
             >
               <Plus className="w-4 h-4" />
             </button>
           </div>
           
           <div className="flex overflow-x-auto hide-scrollbar gap-1 p-1 mb-2 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
             {TABS.map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`flex-1 text-center min-w-max px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                   activeTab === tab 
                     ? 'bg-white dark:bg-[#111] text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700' 
                     : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                 }`}
               >
                 {tab}
               </button>
             ))}
           </div>
        </div>
        
        <div className="p-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-700 dark:text-zinc-300"
            >
              <span className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-zinc-400" />
                {activeFilter}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {showFilters && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg z-10 overflow-hidden">
                {FILTERS.map(filter => (
                  <button
                    key={filter}
                    onClick={() => { setActiveFilter(filter); setShowFilters(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
           {filteredRooms.length === 0 && (
             <div className="p-6 text-center text-sm text-zinc-500">
               No conversations found.
             </div>
           )}
           {filteredRooms.map(room => {
              const member = myMemberInfo(room);
              const lastMsgTime = room.messages?.[0] ? new Date(room.messages[0].createdAt).getTime() : 0;
              const readTime = member?.lastReadAt ? new Date(member.lastReadAt).getTime() : 0;
              const unread = lastMsgTime > readTime && (room.messages?.length || 0) > 0;
              
              return (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className={`w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800/50 ${activeRoom?.id === room.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                    {room.type === 'PERSONAL' ? (
                       <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                         {getRoomName(room).substring(0,2).toUpperCase()}
                       </div>
                    ) : (
                       <Hash className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{getRoomName(room)}</span>
                  </span>
                  {room.messages?.[0] && (
                     <div className="flex flex-col items-end gap-1 flex-shrink-0">
                       <span className="text-[10px] text-zinc-400">
                         {new Date(room.messages?.[0]?.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </span>
                       <div className="flex gap-1">
                         {member?.isPinned && <Pin className="w-3 h-3 text-zinc-400" />}
                         {member?.priority === 'HIGH' && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                         {member?.isMuted && <BellOff className="w-3 h-3 text-zinc-400" />}
                         {unread && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                       </div>
                     </div>
                  )}
                </div>
                <p className={`text-xs truncate pl-7 ${unread ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {room.type !== 'PERSONAL' && (
                    <span className="text-zinc-400 mr-1.5">{room.members.length} members ·</span>
                  )}
                  {room.messages?.[0]?.content || 'No messages yet'}
                </p>
              </button>
           );
           })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a]">
        {activeRoom ? (
          <>
            <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#111]">
               <div className="flex items-center gap-3 min-w-0">
                 <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                    {activeRoom.avatarUrl ? (
                      <img src={activeRoom.avatarUrl} alt="avatar" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      activeRoom.type === 'PERSONAL' ? <Users className="w-5 h-5"/> : <Hash className="w-5 h-5"/>
                    )}
                 </div>
                 <div className="min-w-0">
                    <h3 className="font-semibold truncate">{getRoomName(activeRoom)}</h3>
                    <p className="text-xs text-zinc-500 truncate">
                      {activeRoom.type === 'PERSONAL'
                        ? 'Direct Message'
                        : (activeRoom.description || `${activeRoom.members.length} members`)}
                    </p>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 {myMemberInfo(activeRoom)?.priority === 'HIGH' && (
                    <span className="px-2 py-1 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full uppercase tracking-wider border border-rose-200">
                      Priority
                    </span>
                 )}
                 {activeRoom.type !== 'PERSONAL' && (
                   <button onClick={() => setShowRoomInfo(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md" title="Group settings">
                     <Settings2 className="w-5 h-5 text-zinc-500" />
                   </button>
                 )}
                 <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                   <MoreVertical className="w-5 h-5 text-zinc-500" />
                 </button>
               </div>
            </div>

            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 relative"
            >
              {isLoadingMore && (
                <div className="flex justify-center p-2 absolute top-0 left-0 w-full z-10">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
               {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                 const msg = messages[virtualItem.index];
                 const isMe = msg.senderId === currentUser?.id || msg.senderClientId === currentUser?.id;
                 return (
                   <div 
                     key={msg.id} 
                     data-index={virtualItem.index}
                     ref={rowVirtualizer.measureElement}
                     style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                     }}
                     className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}
                   >
                     <div className={`flex flex-col max-w-[70%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <span className="text-[11px] text-zinc-400 mb-1 px-1 flex items-center gap-2">
                         {isMe ? 'You' : (msg.sender?.name || msg.senderClient?.name || 'Unknown')}
                         {!isMe && msg.senderClient && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider">CLIENT</span>}
                         • {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      
                      <div className={`px-4 py-2.5 rounded-2xl ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                      }`}>
                         {msg.fileUrl && (() => {
                            const fullFileUrl = msg.fileUrl.startsWith('http') 
                              ? msg.fileUrl 
                              : `${API_URL.replace('/api', '')}${msg.fileUrl.startsWith('/') ? '' : '/'}${msg.fileUrl}`;
                            return (
                               <div className="mb-2">
                                  {msg.fileType?.startsWith('image/') ? (
                                     <img src={fullFileUrl} alt="attachment" className="max-w-[200px] rounded-lg border border-black/10" />
                                  ) : (
                                     <a href={fullFileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded-lg text-sm hover:underline">
                                       <FileText className="w-4 h-4" />
                                       File Attachment
                                     </a>
                                  )}
                               </div>
                            );
                         })()}
                         {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                      </div>
                     </div>
                   </div>
                 );
               })}
              </div>
               
               {typingUsers.length > 0 && (
                 <div className="self-start text-xs text-zinc-500 flex items-center gap-1.5 italic mt-4">
                   <span className="flex gap-0.5">
                     <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                     <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                     <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                   </span>
                   {typingUsers.join(', ')} is typing...
                 </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-[#111] border-t border-zinc-200 dark:border-zinc-800">
               <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
                     <input 
                       type="text" 
                       value={inputMessage}
                       onChange={handleTyping}
                       placeholder="Message..." 
                       className="w-full bg-transparent px-4 py-3 outline-none text-sm placeholder:text-zinc-500"
                     />
                     <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex gap-1">
                           <button 
                             type="button" 
                             onClick={() => fileInputRef.current?.click()}
                             className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
                             title="Attach file"
                           >
                              <Paperclip className="w-4 h-4" />
                           </button>
                           <input type="file" ref={fileInputRef} className="hidden" />
                        </div>
                     </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={!inputMessage.trim() && !fileInputRef.current?.value}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex-shrink-0 mb-0.5"
                  >
                    <Send className="w-5 h-5 -ml-1" />
                  </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
             <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-zinc-400" />
             </div>
             <h2 className="text-xl font-semibold mb-2">Vortex Chat</h2>
             <p className="text-zinc-500 max-w-sm text-sm">
               Select a conversation from the sidebar to start messaging, or create a new chat to collaborate with your team.
             </p>
          </div>
        )}
      </div>
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        employees={employees}
        clients={clients}
        currentUserEmail={currentUser?.email}
        onRoomCreated={(newRoom: ChatRoom) => {
          setRooms(prev => {
            if (prev.find(r => r.id === newRoom.id)) return prev;
            return [newRoom, ...prev];
          });
          setActiveRoom(newRoom);
          setShowNewChat(false);
        }}
      />
      <GroupInfoModal
        isOpen={showRoomInfo}
        onClose={() => setShowRoomInfo(false)}
        room={activeRoom!}
        currentUser={currentUser}
        employees={employees}
        onRefresh={refreshRooms}
        onLeave={handleLeaveRoom}
      />
    </div>
  );
}
