import type { Command } from "./types";
import { COMMANDS } from "./commands";

//filter function / wale ke liya 
//returns command menu if nothing or else filter karne lage ga lowercase mein
export function getFilteredCommands(query: string):Command[]{
    if(query.length==0){
        return COMMANDS;
    }
    return COMMANDS
        .filter((cmd)=> cmd.name.toLowerCase().startsWith(query.toLowerCase()));
};