import {TextAttributes} from "@opentui/core";
export function SearchBar() {
    return (
        <box flexDirection="row" gap={1}>
            <text fg="cyan">Build</text>
            <text attributes={TextAttributes.DIM} fg="gray"></text>
            <text>gema4.0</text>
        </box>

    );
}