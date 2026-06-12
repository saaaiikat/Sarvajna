import { Outlet } from "react-router";
import { ToastProvider } from "../providers/toast";
import { ThemeProvider } from "../providers/theme";
import { DialogProvider } from "../providers/dialog";
import { KeyboardLayerProvider } from "../providers/keyboard-layer";
import { Themeroot } from "./themed-root";

export function Rootlayout(){
 return(
      <ThemeProvider>
            <KeyboardLayerProvider>
              <DialogProvider>
                <ToastProvider>
                  <Themeroot>
                    <Outlet/>
                  </Themeroot> 
                </ToastProvider>
              </DialogProvider>
            </KeyboardLayerProvider>
       </ThemeProvider>
 );    
};