import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { database } from '../../../firebase'; // Import your Firebase config
import { ref, push, set, update } from "firebase/database";
import { useAuth } from '../../../components/AuthContext';

const ServicesForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    selectedServices: [],
    userType: '',
  });

  const [readOnlyService, setReadOnlyService] = useState('');

  useEffect(() => {
    if (location.state?.service) {
      setReadOnlyService(location.state.service);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleServiceChange = (e, service) => {
    const isChecked = e.target.checked;
    setFormData((prevData) => {
      let updatedServices = [...prevData.selectedServices];
      if (isChecked) {
        updatedServices.push(service);
      } else {
        updatedServices = updatedServices.filter((item) => item !== service);
      }
      return { ...prevData, selectedServices: updatedServices };
    });
  };

  const handleUserTypeChange = (userType) => {
    setFormData((prevData) => ({
      ...prevData,
      userType: userType,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      if (!user || !user.firebaseKey) {
        throw new Error("You must be logged in to submit this form.");
      }

      const clientFirebaseKey = user.firebaseKey;
      // Generate a new key for the registration
      const newRegistrationRef = push(ref(database, `clients/${clientFirebaseKey}/serviceRegistrations`));
      const registrationKey = newRegistrationRef.key;

      const newServiceRegistration = {
        service: readOnlyService,
        subServices: formData.selectedServices,
        userType: formData.userType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobile: formData.mobile,
        email: formData.email,
        registeredDate: new Date().toISOString().split('T')[0],
        appliedDate: new Date().toISOString().split('T')[0], // Consistent with JobSupport
        timestamp: new Date().toISOString(),
        assignmentStatus: 'registered',
        assignedManager: '',
        paymentStatus: 'Pending',
        country: 'N/A',
        registrationKey: registrationKey,
        clientFirebaseKey: clientFirebaseKey
      };

      const updates = {};

      // 1. Save to Clients node
      updates[`clients/${clientFirebaseKey}/serviceRegistrations/${registrationKey}`] = newServiceRegistration;

      // 2. Save to Index node (Required for Admin Dashboard)
      const indexKey = `${clientFirebaseKey}_${registrationKey}`;
      updates[`service_registrations_index/${indexKey}`] = newServiceRegistration;

      // 3. Update Client Profile
      updates[`clients/${clientFirebaseKey}/firstName`] = formData.firstName;
      updates[`clients/${clientFirebaseKey}/lastName`] = formData.lastName;
      updates[`clients/${clientFirebaseKey}/mobile`] = formData.mobile;
      updates[`clients/${clientFirebaseKey}/email`] = formData.email;

      // Perform atomic update
      await update(ref(database), updates);

      console.log('New service registration saved to Firebase successfully.');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        navigate("/");
      }, 3000);

    } catch (error) {
      console.error("Failed to save to Firebase", error);
      alert("Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const roles = ['Individual', 'Business Owner', 'Startup Founder', 'Agency', 'Student'];

  const serviceMapping = {
    "Mobile Development": [
      "Android App Development",
      "iOS App Development",
      "Cross-Platform Development",
      "Progressive Web Apps (PWA)",
    ],
    "Web Development": [
      "Frontend Development",
      "Backend Development",
      "Database Design & Management",
      "Web Hosting & Deployment",
    ],
    "Digital Marketing": [
      "Email Marketing",
      "Content Marketing",
      "Search Engine Optimization (SEO)",
      "Social Media Marketing (SMM)",
    ],
    "IT Talent Supply": [
      "IT Internship Staffing",
      "Contract Staffing",
      "Permanent Staffing",
      "Remote / Offshore Staffing",
      "Technical Screening & Interviews",
    ],
    "Cyber Security": [
      "Vulnerability Assessment & Penetration Testing (VAPT)",
      "Managed Detection and Response (MDR)",
      "Endpoint Security",
      "Security Information and Event Management (SIEM)",
      "Identity and Access Management (IAM)",
    ],
  };

  return (
    <>
      <style>{modernStyles}</style>
      <div className="service-form-wrapper">
        <div className="form-container-modern">
          <button onClick={handleBackClick} className="back-button-modern">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            Back
          </button>
          <h2 className="form-header-modern">Application Form</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group-modern">
              <label htmlFor="firstName" className="form-label-modern">First Name <span style={{ color: 'red' }}>*</span></label>
              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required className="form-control-modern" />
            </div>
            <div className="form-group-modern">
              <label htmlFor="lastName" className="form-label-modern">Last Name <span style={{ color: 'red' }}>*</span></label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required className="form-control-modern" />
            </div>
            <div className="form-group-modern">
              <label htmlFor="mobile" className="form-label-modern">Mobile<span style={{ color: 'red' }}>*</span></label>
              <input type="tel" id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} required className="form-control-modern" />
            </div>
            <div className="form-group-modern">
              <label htmlFor="email" className="form-label-modern">Email ID <span style={{ color: 'red' }}>*</span></label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="form-control-modern" />
            </div>
            <div className="form-group-modern">
              <label htmlFor="service" className="form-label-modern">Service <span style={{ color: 'red' }}>*</span></label>
              <input type="text" id="service" name="service" value={readOnlyService} readOnly className="form-control-modern form-control-readonly" />
            </div>

            <div>
              <h3 className="section-header-modern">What service do you want?</h3>
              {readOnlyService && (
                <div className="custom-checkbox-group">
                  {serviceMapping[readOnlyService]?.map((service) => (
                    <label key={service} className="custom-checkbox-label">
                      <input type="checkbox" id={service} name="selectedServices" value={service} checked={formData.selectedServices?.includes(service)} onChange={(e) => handleServiceChange(e, service)} className="custom-checkbox-input" />
                      <span className="custom-checkbox-display"></span>
                      {service}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="section-header-modern">Who are you?</h3>
              <div className="user-type-group">
                {roles.map((role) => (
                  <button key={role} type="button" onClick={() => handleUserTypeChange(role)} className={`user-type-button ${formData.userType === role ? "selected" : ""}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button type="submit" className="submit-button-modern" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span style={{ marginLeft: '8px' }}>Submitting...</span>
                  </>
                ) : 'Submit'}
              </button>
            </div>
          </form>
          <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
            <Modal.Header closeButton />
            <Modal.Body style={successModalStyle}>
              <div style={successAnimationContainerStyle}>
                <span style={tickStyle}>✅</span>
              </div>
              <h4 className="success-modal-title">Form Successfully Submitted!</h4>
              <p className="success-modal-message">Your form has been submitted successfully.</p>
            </Modal.Body>
          </Modal>
        </div>
      </div>
    </>
  );
};

const modernStyles = `
  /* --- CYBERPUNK THEME UTILITIES --- */
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');

  .service-form-wrapper {
    /* Match ServiceLayout background */
    background-image: url('../assets/loop.gif'); 
    background-attachment: fixed;
    background-size: cover;
    background-position: center;
    position: relative;
    min-height: 100vh;
    padding: 2rem 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Segoe UI', sans-serif;
    overflow: hidden;
  }

  /* Dark overlay */
  .service-form-wrapper::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 0;
  }

  .form-container-modern {
    background: rgba(20, 20, 20, 0.85); /* Glass-like dark background */
    backdrop-filter: blur(10px);
    padding: 2.5rem 3rem;
    border-radius: 12px;
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
    position: relative;
    width: 100%;
    max-width: 700px;
    z-index: 1;
    border: 1px solid rgba(0, 240, 255, 0.3); /* Cyan border hint */
    animation: fadeIn 0.8s ease-out;
  }

  @media (max-width: 768px) {
    .form-container-modern {
      padding: 2rem 1.5rem;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* --- TYPOGRAPHY --- */
  .form-header-modern {
    color: #00f0ff; /* Cyan */
    margin-bottom: 2rem;
    text-align: center;
    font-size: 2.2rem;
    font-weight: 700;
    font-family: 'Orbitron', sans-serif;
    text-transform: uppercase;
    text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
  }

  .section-header-modern {
    font-size: 1.4rem;
    font-weight: 600;
    color: #e0e0e0;
    margin-top: 2rem;
    margin-bottom: 1.2rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(0, 240, 255, 0.3);
    font-family: 'Orbitron', sans-serif;
    letter-spacing: 1px;
  }

  /* --- INPUTS & LABELS --- */
  .form-group-modern {
    margin-bottom: 1.5rem;
  }

  .form-label-modern {
    display: block;
    font-weight: 500;
    color: #00f0ff;
    margin-bottom: 0.5rem;
    font-family: 'Orbitron', sans-serif;
    font-size: 0.9rem;
    letter-spacing: 0.5px;
  }

  .form-control-modern {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid #4a5568;
    border-radius: 6px;
    background-color: rgba(0, 0, 0, 0.5);
    color: #e0e0e0;
    transition: all 0.3s ease;
  }

  .form-control-modern::placeholder {
    color: #888;
  }

  .form-control-modern:focus {
    border-color: #00f0ff;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
    outline: none;
    background-color: rgba(0, 0, 0, 0.7);
  }

  .form-control-readonly {
    background-color: rgba(255, 255, 255, 0.05);
    color: #aaa;
    border-color: #333;
    cursor: not-allowed;
  }

  /* --- BUTTONS --- */
  .back-button-modern {
    position: absolute;
    top: 25px;
    left: 25px;
    background: transparent;
    border: 1px solid rgba(0, 240, 255, 0.5);
    border-radius: 4px;
    padding: 5px 12px;
    color: #00f0ff;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: 'Orbitron', sans-serif;
    font-size: 0.8rem;
  }
  
  .back-button-modern:hover {
    background: rgba(0, 240, 255, 0.1);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
    transform: translateX(-2px);
  }

  .submit-button-modern {
    width: 100%;
    padding: 14px;
    font-size: 1.2rem;
    font-weight: 600;
    color: #000; /* Contrast text on bright bg */
    background: #00f0ff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 2rem;
    font-family: 'Orbitron', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
  }

  .submit-button-modern:hover:not(:disabled) {
    background: #fff;
    box-shadow: 0 0 25px rgba(0, 240, 255, 0.8);
    transform: translateY(-2px);
  }

  .submit-button-modern:disabled {
    background: #6c757d;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* --- CHECKBOXES --- */
  .custom-checkbox-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  @media (max-width: 576px) {
    .custom-checkbox-group {
      grid-template-columns: 1fr;
    }
  }

  .custom-checkbox-label {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid rgba(0, 240, 255, 0.3);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
    color: #e0e0e0;
    background: rgba(0,0,0,0.3);
  }

  .custom-checkbox-label:hover {
    background: rgba(0, 240, 255, 0.05);
    border-color: #00f0ff;
  }

  .custom-checkbox-input {
    display: none;
  }

  .custom-checkbox-display {
    width: 20px;
    height: 20px;
    border: 2px solid #00f0ff;
    border-radius: 4px;
    margin-right: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    background: transparent;
  }

  .custom-checkbox-input:checked + .custom-checkbox-display {
    background-color: #00f0ff;
    box-shadow: 0 0 8px #00f0ff;
  }

  .custom-checkbox-input:checked + .custom-checkbox-display::before {
    content: '✔';
    color: #000;
    font-size: 12px;
    font-weight: bold;
  }

  /* --- USER TYPE BUTTONS --- */
  .user-type-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .user-type-button {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid rgba(0, 240, 255, 0.4);
    border-radius: 50px;
    cursor: pointer;
    background-color: transparent;
    color: #00f0ff;
    transition: all 0.3s ease;
    font-family: 'Orbitron', sans-serif;
  }

  .user-type-button:hover {
    background-color: rgba(0, 240, 255, 0.1);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
  }

  .user-type-button.selected {
    background-color: #00f0ff;
    color: #000;
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.5);
    border-color: #00f0ff;
    font-weight: 700;
  }

  /* --- MODAL (Success) --- */
  .modal-content {
    background: rgba(20, 20, 20, 0.95) !important;
    border: 1px solid #00f0ff !important;
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.3) !important;
    color: #e0e0e0 !important;
  }
  
  .success-modal-title {
    color: #00f0ff !important;
    font-family: 'Orbitron', sans-serif;
  }
  
  .success-modal-message {
    color: #ccc !important;
  }

  .btn-close {
    filter: invert(1) grayscale(100%) brightness(200%) !important; /* Make close button white/light */
  }
`;

// Styles
const successModalStyle = { textAlign: "center", padding: "30px", borderRadius: "12px", boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)" };
const successAnimationContainerStyle = { width: "80px", height: "80px", margin: "0 auto 20px", backgroundColor: "#2ecc71", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", animation: "scaleIn 0.5s ease-in-out" };
const tickStyle = { fontSize: "40px", color: "#fff", animation: "fadeIn 0.5s ease-in-out" };


const keyframes = `
  @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = keyframes;
document.head.appendChild(styleSheet);

export default ServicesForm;
