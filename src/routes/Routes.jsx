import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import App from '../App';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../components/AuthContext';
import MobileAppDev from '../components/pages/services/MobileAppDev';
import WebAppDev from '../components/pages/services/WebAppDev';
import DigitalMarketing from '../components/pages/services/DigitalMarketing';
import ITTalentSupply from '../components/pages/services/ITTalentSupply';
import JobSupport from '../components/pages/services/JobSupport';
import CyberSecurity from '../components/pages/services/CyberSecurity';
import JobSupportContactForm from '../components/pages/services/JobSupportContactForm';
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

import WhatsAppFloat from '../components/WhatsAppFloat';
import PrivacyPolicy from '../components/PrivacyPolicy';
import TermsOfService from '../components/TermsOfService';
import CookiePolicy from '../components/CookiePolicy';

import AdminPage from '../components/pages/AdminWorkSheet/AdminPage';
import ManagerWorkSheet from '../components/pages/ManagerWorksheet';
import EmployeeData from '../components/pages/Dashboard/EmployeeData';
import ClientDashboard from '../components/pages/Dashboard/ClientDashboard';


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) {
    // If user is not logged in, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  // Check if the user's roles are allowed for this route
  const isAuthorized = user && user.roles && user.roles.some(role => allowedRoles.includes(role));

  if (!isAuthorized) {
    // If logged in but not authorized, redirect to a default/home page
    return <Navigate to="/login" replace />;
  }

  return children;
};


const AppRoutes = () => {
  return (
    <div>
      <AuthProvider>
        <ThemeProvider>
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
              <Route path="/services/job-contact-support" element={<JobSupportContactForm />} />
              <Route path="/services/cyber_security" element={<CyberSecurity />} />

              {/* Services-Path */}
              <Route path="/services/mobile-app-development" element={<MobileAppDev />} />
              <Route path="/services/web-app-development" element={<WebAppDev />} />
              <Route path="/services/digital-marketing" element={<DigitalMarketing />} />
              <Route path="/services/it-talent-supply" element={<ITTalentSupply />} />
              <Route path="/services/job-support" element={<JobSupport />} />
              <Route path="/services/cyber-security" element={<CyberSecurity />} />
              <Route path="/services/job-contact-form" element={<ProtectedRoute allowedRoles={['client']}><JobSupportContactForm /></ProtectedRoute>} />
              {/* <Route path="/services/servicesForm" element={<ProtectedRoute allowedRoles={['client']}><ServicesForm /></ProtectedRoute>} /> */}

              {/* DashBoards */}
              {/* --- Protected Routes with Role-Based Access --- */}
              <Route path="/clientdashboard" element={<ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} />
              {/* <Route path="/assetworksheet" element={<ProtectedRoute allowedRoles={['asset']}><AssetsWorksheet /></ProtectedRoute>} /> */}
              {/* <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Reports /></ProtectedRoute>} /> */}
              <Route path="/employees" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeData /></ProtectedRoute>} />
              {/* <Route path="/workgroups" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><WorkGroups /></ProtectedRoute>} /> */}
              <Route path="/adminpage" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
              {/* <Route path="/adminworksheet" element={<ProtectedRoute allowedRoles={['admin']}><AdminWorksheet /></ProtectedRoute>} /> */}
              <Route path="/managerworksheet" element={<ProtectedRoute allowedRoles={['manager']}><ManagerWorkSheet /></ProtectedRoute>} />
              {/* <Route path="/employee-registration-form" element={<ProtectedRoute allowedRoles={['admin']}><EmployeeRegistrationForm /></ProtectedRoute>} /> */}
              {/* <Route path="/employee-onboarding-sheet" element={<ProtectedRoute allowedRoles={['admin']}><EmployeeOnboardingWorkSheet /></ProtectedRoute>} /> */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
            </Route>
          </Routes>
          <WhatsAppFloat />

        </ThemeProvider>
      </AuthProvider>
    </div>
  );
};

export default AppRoutes;