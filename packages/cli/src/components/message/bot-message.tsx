import { useTheme } from "../../providers/theme";

type Props = {
    Content: string
    message:string
}

export function BotMessage({message,Content}: Props){
    const {colors} = useTheme();

    return (
        <box
        width={100}
        alignItems="center">
           <box paddingY={1} width="100%">
            <box paddingX={3} width="100%">
                <text>{Content}</text>
            </box>
           </box>
           <box paddingX={3} paddingBottom={1} gap={1} width="100%">
                <box flexDirection="row" gap={2}>
                    <text fg={colors.primary}>◉</text>
                    <text>"Model"</text>
                </box>
           </box>
        </box>
    )
}