import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Consultation } from "./pages/Consultation";
import { Confirmation } from "./pages/Confirmation";
import { PatientProfile } from "./pages/PatientProfile";
import { Admin } from "./pages/Admin";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/dossier/:id" element={<PatientProfile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
