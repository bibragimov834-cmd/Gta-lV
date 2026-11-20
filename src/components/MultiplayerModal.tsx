import React, { useState } from 'react';
import { Globe, MessageSquare, Plus, Send, Trophy, UserCheck, UserPlus, Wifi, WifiOff, X } from 'lucide-react';
import { MultiplayerSnapshot } from '../game/types';

interface MultiplayerModalProps {
  mp: MultiplayerSnapshot;
  playerName: string;
  onConnectRoom: (roomId: string, roomName?: string) => void;
  onDisconnect: () => void;
  onSendChat: (text: string) => void;
  onToggleFriend: (name: string) => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  mp,
  playerName,
  onConnectRoom,
  onDisconnect,
  onSendChat,
  onToggleFriend,
  onClose,
}) => {
  const [privateCode, setPrivateCode] = useState('');
  const [chatText, setChatText] = useState('');
  const [friendInput, setFriendInput] = useState('');

  const handleJoinPrivate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = privateCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleaned) return;
    onConnectRoom(`priv_${cleaned}`, `Private Room: ${cleaned}`);
    setPrivateCode('');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText.trim());
    setChatText('');
  };

  const sortedLeaderboard = [...mp.peers].sort((a, b) => b.driftScore - a.driftScore);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/78">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-50">Online Multiplayer &amp; Car Meets</h2>
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                {mp.connected ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Wifi className="w-3.5 h-3.5" /> Connected · Room: {mp.roomId} · {mp.pingMs}ms
                  </span>
                ) : (
                  <span className="text-zinc-400 flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5" /> Offline Mode (Join a server room below)
                  </span>
                )}
                <span>·</span>
                <span>Profile: {playerName}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mp.connected && (
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900/80 border border-red-700/60 text-xs font-medium text-red-200 cursor-pointer"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
          {/* Column 1: Public & Private Rooms */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Live World Rooms</h3>
            <div className="space-y-2">
              {mp.rooms.map((room) => {
                const active = mp.connected && mp.roomId === room.id;
                return (
                  <div
                    key={room.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      active ? 'bg-amber-500/12 border-amber-500' : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-100">{room.name}</span>
                      <span className="text-xs font-mono-num text-amber-400">
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{room.mode}</div>
                    <button
                      onClick={() => onConnectRoom(room.id)}
                      className={`mt-2 w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                      }`}
                    >
                      {active ? 'Joined Active Room' : 'Join World'}
                    </button>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleJoinPrivate} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <div className="text-xs font-medium text-zinc-300">Create / Join Private Room</div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={privateCode}
                  onChange={(e) => setPrivateCode(e.target.value)}
                  placeholder="Room code (e.g. M4CLUB)"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Join</span>
                </button>
              </div>
            </form>
          </div>

          {/* Column 2: Online Players, Drift Leaderboard & Friends */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Room Players ({mp.peers.length})
              </h3>
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Drift Board
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 min-h-[160px] max-h-[220px] overflow-y-auto">
              {sortedLeaderboard.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-8">
                  {mp.connected
                    ? 'You are currently the first driver in this room. Invite friends or open a second tab to drive together!'
                    : 'Connect to a room to see live drivers and drift competition rankings.'}
                </div>
              ) : (
                sortedLeaderboard.map((peer) => {
                  const isFriend = mp.friends.includes(peer.name);
                  return (
                    <div
                      key={peer.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-100 truncate">{peer.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono-num">
                          {peer.inVehicle ? peer.vehicleId.replace('_', ' ').toUpperCase() : 'On Foot'} ·{' '}
                          {peer.speedKmh} km/h · Drift {peer.driftScore.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleFriend(peer.name)}
                        className={`p-1.5 rounded-md border text-xs cursor-pointer ${
                          isFriend
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                        title={isFriend ? 'Remove Friend' : 'Add Friend'}
                      >
                        {isFriend ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Friends Directory */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-300">Friends List ({mp.friends.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {mp.friends.map((f) => (
                  <button
                    key={f}
                    onClick={() => onToggleFriend(f)}
                    className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-200 hover:border-red-500 cursor-pointer"
                    title="Click to remove friend"
                  >
                    {f} ×
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                  placeholder="Add driver name..."
                  className="flex-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                />
                <button
                  onClick={() => {
                    if (friendInput.trim()) {
                      onToggleFriend(friendInput.trim());
                      setFriendInput('');
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-100 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Live Room Chat */}
          <div className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl p-3 h-[340px]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 pb-2 border-b border-zinc-800">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Room Radio Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 py-2">
              {mp.chat.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-10">No messages in this room yet.</div>
              ) : (
                mp.chat.map((msg) => (
                  <div key={msg.id} className="text-xs leading-snug">
                    <span className="font-semibold text-amber-400">{msg.name}: </span>
                    <span className="text-zinc-200">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-1.5 pt-2 border-t border-zinc-800">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                disabled={!mp.connected}
                placeholder={mp.connected ? 'Message room...' : 'Join a room to chat'}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!mp.connected}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
