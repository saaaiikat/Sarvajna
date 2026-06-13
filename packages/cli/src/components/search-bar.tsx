import {TextAttributes} from "@opentui/core";
import { useTheme } from "../providers/theme";


export function SearchBar() {
    const {colors} = useTheme();
    return (
        <box flexDirection="row" gap={1}>
            <text fg={colors.primary}>Build</text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}></text>
            <text>gema4.0</text>
        </box>

    );
}