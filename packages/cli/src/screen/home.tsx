import {useCallback} from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/header";
import {InputBar} from "../components/input-bar"

export function Home(){
    const navigate = useNavigate();
    const HandleSubmit = useCallback(
    (text:string) => {
        navigate("/session/new", {state:{message:text}});
    },
    [navigate],)
    
    return (
        <box
            alignItems="center"
            justifyContent="center"
            flexGrow={1}
            position="relative"
            width="100%"
            height="100%"
        >
            <Header/>
            <box 
                width="100%"
                maxWidth={78}
                paddingX={2}
            >
                <InputBar onSubmit={HandleSubmit}/>
            </box>
        </box>
);
};