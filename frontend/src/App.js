// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Trading from "./pages/Trading";
import Watchlist from "./pages/Watchlist";
import Charts from "./pages/Charts";
import Learning from "./pages/Learning";
import StrategyLab from "./pages/StrategyLab";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trade" element={<Trading />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/learn" element={<Learning />} />
        <Route path="/strategy" element={<StrategyLab />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
