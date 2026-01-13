import React, { useEffect } from 'react';
import '../../../styles/ServiceLayout.css';
import img1 from '../../../assets/mobile4.png';
import CustomNavbar from '../../../components/Navbar';
import { useNavigate } from 'react-router-dom';

const ITTalentSupply = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!window.location.hash.includes('#')) {
      window.location.href = window.location.href + '#';
      window.location.reload();
    }
  }, []);
  return (
    <div className="mobile-app-dev service-box">
      <CustomNavbar />
      <h2 className="section-title">IT Talent Supply</h2>

      {/* Single image display */}
      <div className="single-image-container">
        <img src={img1} alt="IT Talent Supply" className="service-image" />
      </div>

      <div className="service-description">
        <h4>IT Talent Supply – Zethon Tech Private Limited</h4>
        <p>
          At Zethon Tech Private Limited, we specialize in IT talent supply solutions, helping businesses find the right tech professionals to drive innovation and success. Whether you need contract-based, full-time, or project-based IT talent, we provide skilled professionals tailored to your business needs.
        </p>

        <h4>Our IT Talent Supply Services</h4>
        <p>
          We connect companies with highly skilled IT professionals across various technologies and domains, ensuring you have the right talent to meet your project and business demands.
        </p>

        <h4>Key IT Talent Solutions</h4>
        <ul>
          <li><strong>Permanent Staffing</strong> – Hire top IT professionals for long-term roles across various industries.</li>
          <li><strong>Contract Staffing</strong> – Flexible hiring options for short-term and project-based requirements.</li>
          <li><strong>Remote IT Talent</strong> – Access a global pool of remote IT experts to work on your projects.</li>
          <li><strong>Executive Search</strong> – Find highly skilled and experienced IT leaders for critical roles.</li>
          <li><strong>Project-Based IT Staffing</strong> – Deploy the right talent for specific IT projects, ensuring success.</li>
          <li><strong>On-Demand IT Experts</strong> – Quickly hire professionals to address urgent skill gaps.</li>
        </ul>
        <div className="contact-container">
          <h2 className="headline">Want to know more or work with us?</h2>
          <a href="https://wa.me/919052990765" target="_blank" rel="noopener noreferrer" className="contact-button">
            Contact Us
          </a>
          <span style={{ color: '#fff', margin: '0 10px', fontWeight: 'bold' }}>---- or ----</span>
          <button
            className="contact-button"
            style={{ marginTop: '15px', marginLeft: '15px', cursor: 'pointer' }}
            onClick={() => navigate('/services/apply', { state: { service: 'IT Talent Supply' } })}
          >
            Apply Now
          </button>

        </div>

      </div>
    </div>
  );
};

export default ITTalentSupply;