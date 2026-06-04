import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Header } from "./components/header";
import { SearchBar } from "./components/search-bar";  
import { InputBar } from "./components/input-bar";
import { KeyboardLayerProvider } from "./providers/keyboard-layer";
import { ToastProvider } from "./providers/toast";
import { ThemeProvider ,useTheme} from "./providers/theme";
import { DialogProvider } from "./providers/dialog";

function Themeroot(){
  const {colors} = useTheme();

  return (
    <box 
      alignItems="center" 
      justifyContent="center"
      backgroundColor={colors.background}
      height="100%" 
      width="100%" 
      gap={1}>
      <Header />
        <box width="100%" maxWidth={78} paddingX={2}>
          <InputBar onSubmit={()=> {}}/>
        </box>
    </box>
  )
}

function App() {
  return (
      <ThemeProvider>
        <KeyboardLayerProvider>
          <DialogProvider>
            <ToastProvider>
              <Themeroot/>
            </ToastProvider>
          </DialogProvider>
        </KeyboardLayerProvider>
      </ThemeProvider>
    
  );
}


const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC:false,
});
createRoot(renderer).render(<App />);
