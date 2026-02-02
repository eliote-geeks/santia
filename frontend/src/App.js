import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Consultation } from "./pages/Consultation";
import { Confirmation } from "./pages/Confirmation";
import { PatientProfile } from "./pages/PatientProfile";
import { AdminConsultations } from "./pages/admin/AdminConsultations";
import { AdminDoctors } from "./pages/admin/AdminDoctors";
import { AdminPatients } from "./pages/admin/AdminPatients";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Messagerie } from "./pages/Messagerie";
import { AssistantWidget } from "./components/AssistantWidget";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dossier" element={<PatientProfile />} />
          <Route path="/dossier/:id" element={<PatientProfile />} />
          <Route path="/messagerie" element={<Messagerie />} />
          <Route path="/admin" element={<AdminConsultations />} />
          <Route path="/admin/consultations" element={<AdminConsultations />} />
          <Route path="/admin/doctors" element={<AdminDoctors />} />
          <Route path="/admin/patients" element={<AdminPatients />} />
        </Routes>
        <AssistantWidget />
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;
