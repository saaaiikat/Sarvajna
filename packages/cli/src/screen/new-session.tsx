import { useEffect } from "react";
import { useNavigate, useLocation, replace } from "react-router";
import { useTheme } from "../providers/theme";
import { ErrorMessage,UserMessage, BotMessage} from "../components/message";
import { ShellSession } from "../components/shell-session";


export function NewSession() {
    const navigate = useNavigate();
    const location = useLocation();
    const { colors } = useTheme();

const state = location.state as {message?: string } | null ;

    useEffect(() => {         //The useEffect block serves as a guard. If the data isn't valid (!state.success),
    //                         it forces the user back 
    //                         to the homepage (navigate("/")). This prevents the application
    //                         from trying to render a session without the necessary configuration.
        if (!state?.message) {
            navigate("/",{replace:true});
        }
    }, [state, navigate]);

    if (!state?.message) {
    return null;
    }
    return (
        <ShellSession OnSubmit={()=>{}} inputDisabled loading>
           <UserMessage message={state.message}/>
            <BotMessage Content ="This is a sample bot message."
           model ="gemma 3.1 flash"/>
        </ShellSession> 
    );

};