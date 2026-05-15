import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { filterSensitiveContent, containsSensitiveContent } from "@/lib/contentFilter";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface OfferChatProps {
  offerId: string;
  otherUserName: string;
}

const OfferChat = ({ offerId, otherUserName }: OfferChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [warning, setWarning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offerId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${offerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `offer_id=eq.${offerId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [offerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show warning when typing sensitive info
  useEffect(() => {
    setWarning(containsSensitiveContent(newMessage));
  }, [newMessage]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);

    // Filter sensitive content before sending
    const { filtered } = filterSensitiveContent(newMessage.trim());

    await supabase.from("chat_messages").insert({
      offer_id: offerId,
      sender_id: user.id,
      content: filtered,
    });
    setNewMessage("");
    setWarning(false);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="border-b px-4 py-2 text-sm font-medium flex items-center justify-between">
        <span>Chat with {otherUserName}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldAlert className="h-3 w-3" /> Protected
        </span>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="mb-3 mx-auto max-w-[90%] rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-center text-xs text-amber-700 dark:text-amber-400">
          <ShieldAlert className="inline h-3 w-3 mr-1" />
          For your safety, phone numbers, emails, links and other personal data are automatically masked. Keep communication within the platform.
        </div>

        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          // Also filter on display in case old messages weren't filtered
          const { filtered: displayContent } = filterSensitiveContent(msg.content);
          return (
            <div key={msg.id} className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p>{displayContent}</p>
                <p className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </ScrollArea>

      {warning && (
        <div className="mx-3 mb-1 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs text-destructive flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          Personal info detected and will be masked when sent.
        </div>
      )}

      <div className="border-t p-3 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default OfferChat;
