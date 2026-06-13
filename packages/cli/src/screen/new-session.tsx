import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { ShellSession } from "../components/shell-session";
import { ErrorMessage, UserMessage, BotMessage } from "../components/message";

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { message?: string } | null;

  useEffect(() => {
    if (!state?.message) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  if (!state?.message) return null;

  return (
    <ShellSession onSubmit={() => {}} inputDisabled loading>
      <UserMessage message={state.message} />
      <BotMessage 
        Content="This is a sample bot response to demonstrate the message layout." 
        model="opus-4-6"
      />
      <ErrorMessage message="This is a sample error message." />
    </ShellSession>
  );
};