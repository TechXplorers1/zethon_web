import React, { useEffect } from 'react';
import '../../../styles/ServiceLayout.css';
import img1 from '../../../assets/mobile2.png';
import CustomNavbar from '../../../components/Navbar';
import { useNavigate } from 'react-router-dom';

const WebAppDev = () => {
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
      <h2 className="section-title">Web Application Development</h2>

      {/* Single image display */}
      <div className="single-image-container">
        <img src={img1} alt="Web Application Development" className="service-image" />
      </div>

      <div className="service-description">
        <h4>Web Application Development – Zethon Tech Private Limited</h4>
        <p>
          At Zethon Tech Private Limited, we design and develop scalable, secure, and high-performance web applications that empower businesses across industries. Whether you need a robust enterprise solution, SaaS product, e-commerce platform, or a custom web portal, our team delivers cutting-edge web applications that drive engagement, efficiency, and revenue growth.
        </p>

        <h4>Our Web Application Development Services</h4>
        <p>
          We offer end-to-end web application development solutions, ensuring your web platform is responsive, secure, and aligned with your business objectives.
        </p>

        <h4>Custom Web App Development</h4>
        <ul>
          <li>We create web applications that align with your business needs, industry standards, and customer expectations.</li>
          <li>Modern Tech Stack – We utilize React.js, Angular, Vue.js, Node.js, Python, Laravel, and PHP for scalable and efficient development.</li>
          <li>Full-Stack Development – From front-end design to back-end architecture, we deliver complete web solutions.</li>
          <li>Fast & Responsive – Optimized performance for quick loading times.</li>
        </ul>

        <h4>Web Application Development Process</h4>
        <p>We follow an agile and result-driven development process, ensuring quality, scalability, and performance.</p>
        <ul>
          <li>Requirement Analysis & Planning – Understanding your business goals and project requirements.</li>
          <li>UI/UX Design & Prototyping – Crafting intuitive and engaging interfaces for a seamless user experience.</li>
          <li>Development & Testing – Coding, integration, and rigorous testing to ensure flawless functionality.</li>
          <li>Deployment & Launch – Ensuring a smooth launch with cloud hosting, domain setup, and database configurations.</li>
          <li>Ongoing Maintenance & Upgrades – Continuous monitoring, bug fixes, security updates, and feature enhancements.</li>
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
            onClick={() => navigate('/services/apply', { state: { service: 'Web Development' } })}
          >
            Apply Now
          </button>

        </div>
      </div>
    </div>
  );
};

export default WebAppDev;