import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from '../App';
import MobileAppDev from '../components/pages/services/MobileAppDev';
import WebAppDev from '../components/pages/services/WebAppDev';
import DigitalMarketing from '../components/pages/services/DigitalMarketing';
import ITTalentSupply from '../components/pages/services/ITTalentSupply';
import JobSupport from '../components/pages/services/JobSupport';
import CyberSecurity from '../components/pages/services/CyberSecurity';
import ContactForm from '../components/pages/services/JobSupportContactForm';
import ServiceLayout from '../components/ServiceLayout';
import Contact from '../components/Contact';
import BFSI from '../components/pages/industries/BFSI';
import Construction from '../components/pages/industries/Construction';
import Education from '../components/pages/industries/Education';
import Government from '../components/pages/industries/Government';
import Healthcare from '../components/pages/industries/Healthcare';
import Manufacturing from '../components/pages/industries/Manufacturing';
import OilGas from '../components/pages/industries/OilGas';
import Retail from '../components/pages/industries/Retail';
import Telecommunication from '../components/pages/industries/Telecommunication';
import LoginPage from '../components/login';
import SignupPage from '../components/signup';
import AdminPage from '../components/pages/AdminWorkSheet/AdminPage';
import ManagerWorkSheet from '../components/pages/ManagerWorksheet';
import EmployeeData from '../components/pages/Dashboard/EmployeeData';
import ClientDashboard from '../components/pages/Dashboard/ClientDashboard';



const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/Contact" element={<Contact />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/adminpage" element={<AdminPage />} />
      <Route path="/managerworksheet" element={<ManagerWorkSheet />} />
      <Route path="/employees" element={<EmployeeData />} />
      <Route path="/clientdashboard" element={<ClientDashboard />} />
      <Route element={<ServiceLayout />}>

        <Route path="/industries/bfsi" element={<BFSI />} />
        <Route path="/industries/construction" element={<Construction />} />
        <Route path="/industries/education" element={<Education />} />
        <Route path="/industries/government" element={<Government />} />
        <Route path="/industries/healthcare" element={<Healthcare />} />
        <Route path="/industries/manufacturing" element={<Manufacturing />} />
        <Route path="/industries/oil-gas" element={<OilGas />} />
        <Route path="/industries/retail" element={<Retail />} />
        <Route path="/industries/telecommunication" element={<Telecommunication />} />
        <Route path="/services/mobile-app-development" element={<MobileAppDev />} />
        <Route path="/services/web-app-development" element={<WebAppDev />} />
        <Route path="/services/digital-marketing" element={<DigitalMarketing />} />
        <Route path="/services/it-talent-supply" element={<ITTalentSupply />} />
        <Route path="/services/job-support" element={<JobSupport />} />
        <Route path="/services/job-contact-support" element={<ContactForm />} />
        <Route path="/services/cyber_security" element={<CyberSecurity />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;