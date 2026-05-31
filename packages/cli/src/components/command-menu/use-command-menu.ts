import { useRef, useState, useMemo } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { getFilteredCommands } from "./filter-command";
import type { Command } from "./types";
import type { RefObject } from "react";

type UseCommandMenuReturn = {
    showCommandMenu: boolean;
    commandQuery: string;
    selectedIndex: number;
    scrollRef: RefObject<ScrollBoxRenderable | null>;
    handleContentChange: (text: string) => void;
    resolveCommand: (index: number) => Command | undefined;
    setSelectedIndex: (index: number) => void;
};

export function useCommandMenu(): UseCommandMenuReturn {
    const [textValue, setTextValue] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showCommandMenu, setShowCommandMenu] = useState(false);
    const scrollRef = useRef<ScrollBoxRenderable | null>(null); // FIX #2

    const commandQuery =
        showCommandMenu && textValue.startsWith("/") ? textValue.slice(1) : "";
    const filteredCommands = useMemo(  // FIX #9
        () => getFilteredCommands(commandQuery),
        [commandQuery]
    );

    const handleContentChange = (text: string) => {
        setTextValue(text);
        setSelectedIndex(0);

        // Jump back to the top of the list when the user types a new character
        const scrollbox = scrollRef.current;
        if (scrollbox) {
            scrollbox.scrollTo(0);
        }

        const prefix = text.startsWith("/") ? text.slice(1) : null;
        if (prefix !== null && !prefix.includes("/")) {
            setShowCommandMenu(true);
        } else {
            setShowCommandMenu(false);
        }
    }; // FIX #3 — properly closed

    // Resolve a command at a specific index (returns the command)
    const resolveCommand = (index: number): Command | undefined => {
        const command = filteredCommands[index];
        if (command) {
            setShowCommandMenu(false);
        }
        return command;
    };

    // Arrow keys on the keyboard selection; the list follows along when the highlight goes off-screen
    useKeyboard((key) => {
        if (!showCommandMenu) return;
        if (key.name === "escape") {
            setShowCommandMenu(false); // FIX #4
        } else if (key.name === "up") { // FIX #5
            setSelectedIndex(Math.max(0, selectedIndex - 1));
        } else if (key.name === "down") {
            setSelectedIndex(Math.min(filteredCommands.length - 1, selectedIndex + 1));
        }
    });

    return { // FIX #6
        showCommandMenu,
        commandQuery,
        selectedIndex,
        scrollRef,
        handleContentChange,
        resolveCommand,
        setSelectedIndex,
    };
}