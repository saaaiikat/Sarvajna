import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Header } from "./components/header";
import { SearchBar } from "./components/search-bar";  
import { InputBar } from "./components/input-bar";

function App() {
  return (
    <box alignItems="center" justifyContent="center" backgroundColor="#1a1a1a" height="100%" width="100%" gap={1}>
      <Header />
      <box width="100%" maxWidth={78} paddingX={2}>
        <InputBar onSubmit={()=> {}}/>
      </box>
    </box>
  );
}


const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
