import React from "react";
import { createRoot } from "react-dom/client";
import PromptLibrary from "../src/PromptLibrary.jsx";
import "./standalone.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PromptLibrary />
  </React.StrictMode>
);
