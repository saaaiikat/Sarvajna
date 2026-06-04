import { SearchBar } from "./search-bar";
import { useRef,useCallback,useEffect } from "react";
import {EmptyBorder} from "./Emptyborder";
import { TextareaRenderable } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import type { KeyBinding } from "@opentui/core";
import { CommandMenu } from "./command-menu";
import type { Command } from "./command-menu/types";
import  { useCommandMenu } from "./command-menu/use-command-menu";
import { resolve } from "bun";
import { useToast } from "../providers/toast";
import { useKeyboardLayer } from "../providers/keyboard-layer";
type Props = {
    onSubmit: (text: string) => void;
    disabled?: boolean;
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
    { name: "return",action: "submit" },
    { name: "enter",action: "submit" },
    { name: "return",shift:true , action: 'newline' },
    { name: "enter", shift:true,action: 'newline' },
]; /*for using enter to submit an i/p and is use shift and enter then newline*/

export function InputBar({onSubmit, disabled}: Props) {
    const textareaRef = useRef<TextareaRenderable>(null);
    const onSubmitRef = useRef<() => void >(()=> {});
    const renderer = useRenderer(); 
    const toast = useToast();
    const {isTopLayer, setResponder}= useKeyboardLayer();   

    const {
        showCommandMenu,
        commandQuery,
        selectedIndex,
        scrollRef,
        handleContentChange,
        resolveCommand,
        setSelectedIndex,
    } = useCommandMenu();

    const handleCommandExecute = useCallback((index: number)=>{
        const command = resolveCommand(index);
        handleCommand(command);
    },[]);
    const handleTextareaContentChange = useCallback(()=>{
        const textarea = textareaRef.current;
        if(!textarea) return;

        handleContentChange(textarea.plainText);
    },[]);

    const handleSubmit = useCallback(()=>{
        if (disabled) return;
        const textArea = textareaRef.current;
        if(!textArea) return;

        const text = textArea.plainText.trim();
        if(text.length ===0) return;

        onSubmit(text);
        textArea.setText("")//clearing text area value
    },[disabled,onSubmit])


    const handleCommand = useCallback((
        command : Command | undefined
    )=> {
        const textarea = textareaRef.current;
        if(!textarea || ! command) return; 

        textarea.setText("");
        
        if(command.action){
            command.action({
                exit: () => renderer.destroy(),
            });
        }
        else{
            textarea.insertText(command.value + " ");
        }

    },[renderer]);


    useEffect(()=> {
        const textarea = textareaRef.current;
        if(!textarea) return;
        textarea.onSubmit = () =>{
            onSubmitRef.current();
        };

    }, []);

    onSubmitRef.current = () =>{
        if(disabled) return;

        if(showCommandMenu){
            const command = resolveCommand(selectedIndex);
            handleCommand(command);
            return;
        }

        handleSubmit();
    };


    useEffect(()=>{
        setResponder("base",()=>{
            if (disabled) return false;
            const textarea = textareaRef.current;
            if(textarea && textarea.plainText.length >0){
                textarea.setText("");
                return true;
            }

            return false;
        });

        return ()=>setResponder("base",null);
    },[disabled,setResponder])

    return (
        <box width ="100%" alignItems="center">
            <box
            border={['left']}
            borderColor={"cyan"}
            customBorderChars={{
                ...EmptyBorder,
                vertical: "┃",
            }}
            width="100%"
            
            >
            <box
                position="relative"
                justifyContent="center"
                backgroundColor="#121212"
                paddingX={2}
                paddingY = {1}
                width = "100%"
                gap={1.2}

            >
                {showCommandMenu && (
                    <box
                        position="absolute"
                        bottom="100%"
                        left={0}
                        width="100%"
                        backgroundColor="#121212"
                        zIndex={10}
                    >
                    <CommandMenu
                        selectedIndex={selectedIndex}
                        query={commandQuery}
                        scrollRef={scrollRef}
                        onSelect={setSelectedIndex}
                        onExecute={handleCommandExecute}
                    />
                    </box>
                )}
                <textarea
                ref={textareaRef}
                focused={!disabled && isTopLayer("base") || isTopLayer("command")}
                keyBindings={TEXTAREA_KEY_BINDINGS}
                onContentChange={handleTextareaContentChange}
                placeholder={'Asking anything..."find error in the database"'}/>
                <SearchBar/>
                </box>
            </box>
        </box>
);
}
