import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createMemoryRouter,RouterProvider } from "react-router";
import { Rootlayout } from "./layouts/root-layout";
import { Home } from "./screen/home";
import { NewSession } from "./screen/new-session";
import { SessionID } from "./screen/session-id";
const router = createMemoryRouter([
  {
    path:"/",
    element:<Rootlayout/>,
    children:[
      {index:true, element:<Home/>},
      {path:"session/new", element:<NewSession/>},
      {path:"sessions/:id", element:<SessionID/>},
    ],
  },
]);
function App() {
  return<RouterProvider router={router}/>
}


const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC:false,
});
createRoot(renderer).render(<App />);
