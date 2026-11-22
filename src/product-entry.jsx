import React from "react";
import { createRoot } from "react-dom/client";
import ProductPortal from "./ProductPortal.jsx";
import "./index.css";
import "./shivasha-theme.css";

const root = document.getElementById("root");
const productId = root?.dataset.product;
createRoot(root).render(<React.StrictMode><ProductPortal productId={productId} /></React.StrictMode>);
