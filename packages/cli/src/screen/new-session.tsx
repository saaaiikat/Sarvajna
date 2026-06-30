import { useEffect, useMemo, useRef } from "react";
import {z} from "zod";
import {DEFAULT_CHAT_MODEL_ID} from "@sarvajna/shared";
import { useNavigate, useLocation } from "react-router";
import { ShellSession } from "../components/shell-session";
import { UserMessage } from "../components/message";
import {useToast} from "../providers/toast";
import {client} from "../lib/api-client";
import {getErrorResponse} from "../lib/http-errors";

const newSessionStateSchema = z.object({
  message: z.string()
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const hasStartedRef = useRef(false); // to cancel double useeffect calls in strict mode
  const state = useMemo(() => {
      const parsed = newSessionStateSchema.safeParse(location.state);
      return parsed.success ? parsed.data : null;
  } , [location.state])

  //Guard to prevent direct access to this page without a message and go home instead
  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  //Screen jaha se user will be redirected after the session is created like a chat screen
  useEffect(() => {
    if (!state|| hasStartedRef.current) return;
    hasStartedRef.current = true;
    let ignore = false;
    const createSession = async () => {
      try {
        const response = await client.sessions.$post({
          json: {
            title: state.message.slice(0, 100),
            cwd: process.cwd(),
            initialMessage: {
              role: "USER",
              content: state.message,
              mode: "BUILD",
              model: DEFAULT_CHAT_MODEL_ID,
            },
          },
        });

        if (ignore) return;
        if(!response.ok) {
          throw new Error(await getErrorResponse(response));
        }  
        const session = await response.json();
        navigate(
          `/sessions/${session.id}`,
          { replace: true,state:{session} }
        );
        // navigate to created session if response contains id
} 
      catch (e) {
        if (ignore) return;

        toast.show({
          variant: "error",
          message: e instanceof Error ? e.message: "Failed tp create session",
        });
        navigate("/", { replace: true });// navigate to home if error occurs and not to keep user stuck on error page
      }
    };

    createSession();

    return () => {
      ignore = true;
    };
  }, [state, navigate, toast]);

  if (!state?.message) return null;

  return (
    <ShellSession onSubmit={() => {}} inputDisabled loading>
      <UserMessage message={state.message} />
      
    </ShellSession>
  );
};