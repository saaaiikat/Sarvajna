import { useParams } from "react-router";

export function SessionID(){
    const {id} = useParams();
    return (
        <box flexGrow={1} padding={2}>
            <text>Session {id}</text>
        </box>
    )
}