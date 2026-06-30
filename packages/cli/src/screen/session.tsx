import { ShellSession } from "../components/shell-session";
import {useState, useEffect, useMemo} from "react";
import {useParams, useLocation, useNavigate} from "react-router";
import { z} from "zod";
import type { InferResponseType } from "hono/client";
import {UserMessage,BotMessage,ErrorMessage} from "../components/message";
import {useToast} from "../providers/toast";
import {client} from "../lib/api-client";
import {getErrorResponse} from "../lib/http-errors";

type SessionData = InferResponseType<(typeof client.sessions)[":id"]["$get"], 200>;

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>((value) => value != null && typeof value === "object" && "id" in value)

});

function ChatMessage(
  {msg} : {
    msg: SessionData["messages"][number]
  }
) {
  if (msg.role === "USER") {
    return <UserMessage message={msg.content} />;
  }
  if (msg.role === "ERROR") {
    return <ErrorMessage message={msg.content} />;
  }
  return <BotMessage Content={msg.content} model = {msg.model} />;
  
};
export function Session() {
  const {id} = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);
// using useEffect to fetch users older session data if not prefetched
  useEffect(() => {
    //skip fetch if session data is already prefetched
    if (prefetched) return;

    setSession(null);
    if (!id) return ;
    let ignore = false;
    const fetchSession = async () => {
      try {
        const response = await client.sessions[":id"].$get({
          param: { id },
        });  
      
      if (ignore) return;
      if(!response.ok) {
        throw new Error(await getErrorResponse(response));
      }
      const resolved = await response.json();
      setSession(resolved); 
    }
      catch (error) {
        if (ignore) return;
        toast.show({
          variant:"error",
          message: error instanceof Error ? error.message : "Failed to load session",
        });
        navigate("/", { replace: true });
      }
    };
    fetchSession();
    return () => {
      ignore = true;
    };
  }, [id, prefetched, navigate, toast]);


  if (!session) {
    return <ShellSession onSubmit={() => {}} inputDisabled/>;
  }

  return <ShellSession onSubmit={() => {}} inputDisabled>
    {
      session.messages.map((msg, index) => (
        <ChatMessage key={index} msg={msg} />
      ))
    }
    </ShellSession >;
};