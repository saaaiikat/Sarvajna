import { ShellSession } from "../components/shell-session";
import {useState, useEffect, useMemo} from "react";
import {useParams, useLocation, useNavigate} from "react-router";
import { z} from "zod";
import prettyMs from "pretty-ms";
import {useKeyboard} from "@opentui/react";
import {useKeyboardLayer} from "../providers/keyboard-layer";
import {DEFAULT_CHAT_MODEL_ID, type SupportedChatModelId} from "@sarvajna/shared";
import type { InferResponseType } from "hono/client";
import {UserMessage,BotMessage,ErrorMessage} from "../components/message";
import {useToast} from "../providers/toast";
import {client} from "../lib/api-client";
import {getErrorResponse} from "../lib/http-errors";
import {MessageStatus} from "@sarvajna/database/enums";
import {useChat} from "../hooks/use-chat";
import type {Message,ClientMessagePart} from "../hooks/use-chat";


type SessionData = InferResponseType<(typeof client.sessions)[":id"]["$get"], 200>;

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>((val) => val != null && typeof val === "object" && "id" in val),
});

function mapDbMessages(dbMessages: SessionData["messages"]): Message[] {
  return dbMessages.map((m): Message => {
    if (m.role === "ERROR") {
      return { id: m.id, role: "error", content: m.content };
    }

    if (m.role === "USER") {
      return {
        id: m.id,
        role: "user",
        content: m.content,
        mode: m.mode,
        model: m.model as SupportedChatModelId,
      };
    }

    return {
      id: m.id,
      role: "assistant",
      content: m.content,
      model: m.model as SupportedChatModelId,
      mode: m.mode,
      parts: [{ type: "text", text: m.content }],
      ...(m.duration != null ? { duration: prettyMs(m.duration * 1000) } : {}),
      interrupted: m.status === MessageStatus.INTERRUPTED,
    };
  });
};

function ChatMessage(
  { msg }: {
    msg: Message
  }
) {
  if (msg.role === "user") {
    return <UserMessage message={msg.content} />;
  }

  if (msg.role === "error") {
    return <ErrorMessage message={msg.content} />;
  }

  return (
    <BotMessage
      parts={msg.parts}
      model={msg.model}
      mode={msg.mode}
      duration={msg.duration}
      streaming={false}
      interrupted={msg.interrupted}
    />
  );
};

function SessionChat({ session }: { session: SessionData }) {
  const [initialMessages] = useState(() => mapDbMessages(session.messages));
  const { isTopLayer } = useKeyboardLayer();
  const { messages, streaming, submit, abort, interrupt } = useChat(session.id, initialMessages);

  // Stop the pending reply when the user leaves this session.
  useEffect(() => {
    return () => abort();
  }, [abort]);

  // Let the user cancel a reply even before the first streamed chunk arrives.
  useKeyboard((key) => {
    if (key.name === "escape" && isTopLayer("base") && streaming.status === "streaming") {
      key.preventDefault();
      interrupt();
    }
  });

  return (
    <ShellSession
      onSubmit={(text) =>
        submit({ userText: text, mode: "BUILD", model: DEFAULT_CHAT_MODEL_ID })
      }
      loading={streaming.status === "streaming"}
      interruptible={streaming.status === "streaming"}
    >
      {messages.map((msg) => (
        <ChatMessage key={msg.id} msg={msg} />
      ))}
      {streaming.status === "streaming" && streaming.parts.length > 0 && (
        <BotMessage
          parts={streaming.parts}
          model={streaming.model}
          mode={streaming.mode}
          streaming
        />
      )}
    </ShellSession>
  );
}

export function Session() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);

  useEffect(() => {
    // Skip fetch if session was passed via location state
    if (prefetched) return;

    setSession(null);

    if (!id) return;

    let ignore = false;
    const fetchSession = async () => {
      try {
        const res = await client.sessions[":id"].$get({ 
          param: { id },
        });
        if (ignore) return;
        if (!res.ok) throw new Error(await getErrorResponse(res));
        const resolved = await res.json();
        setSession(resolved);
      } catch (err) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message: err instanceof Error ? err.message : "Failed to load session",
        });
        navigate("/", { replace: true });
      }
    };

    fetchSession();
    return () => {
      ignore = true;
    };
  }, [id, prefetched, toast, navigate]);

  if (!session) {
    return <ShellSession onSubmit={() => {}} inputDisabled loading />;
  }

  return <SessionChat key={session.id} session={session} />
};