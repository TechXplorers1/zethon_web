import React, { useEffect } from 'react';
import '../../../styles/ServiceLayout.css';
import img1 from '../../../assets/mobile6.jpeg';
import CustomNavbar from '../../../components/Navbar';
import { useNavigate } from 'react-router-dom';

const CyberSecurity = () => {
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
      <h2 className="section-title">Cyber Security</h2>

      {/* Single image display */}
      <div className="single-image-container">
        <img src={img1} alt="Cyber Security" className="service-image" />
      </div>

      <div className="service-description">
        <h4>Our Cyber Security Services</h4>
        <p>
          We offer comprehensive cyber security solutions designed to protect your digital assets, safeguard sensitive data, and ensure the integrity and availability of your IT infrastructure.
        </p>

        <h4>Key Cyber Security Solutions</h4>
        <ul>
          <li>Threat Detection & Response – Identify and neutralize cyber threats in real-time to minimize damage and downtime.</li>
          <li>Network Security – Secure your internal and external network infrastructure against unauthorized access and attacks.</li>
          <li>Data Protection & Encryption – Protect sensitive data at rest and in transit using advanced encryption techniques.</li>
          <li>Penetration Testing – Simulate real-world attacks to identify and fix vulnerabilities before they are exploited.</li>
          <li>Security Audits & Compliance – Conduct comprehensive security assessments and ensure compliance with industry standards like ISO 27001, GDPR, and HIPAA.</li>
          <li>Endpoint Security – Protect all endpoints, including desktops, laptops, and mobile devices, from malware and cyber threats.</li>
          <li>Cloud Security – Secure your cloud environments and ensure safe data storage, access, and management.</li>
          <li>Incident Management & Recovery – Respond to security incidents swiftly and recover critical systems with minimal disruption.</li>
        </ul>

        <h4>Industries We Serve</h4>
        <p>We provide customized cyber security strategies for businesses across multiple industries:</p>
        <ul>
          <li>Finance & Banking</li>
          <li>Healthcare & Pharmaceuticals</li>
          <li>Government & Defense</li>
          <li>E-Commerce & Retail</li>
          <li>Education & Training</li>
          <li>Technology & SaaS</li>
          <li>Energy & Utilities</li>
          <li>Manufacturing & Industrial</li>
        </ul>

        <h4>Our Cyber Security Process</h4>
        <p>We follow a structured and proactive approach to secure your digital environment and mitigate cyber risks:</p>
        <ul>
          <li>Risk Assessment – Identify critical assets, vulnerabilities, and potential threats to your organization.</li>
          <li>Strategy Development – Create a tailored cyber security plan based on your industry, compliance needs, and business goals.</li>
          <li>Implementation & Hardening – Deploy security tools, configure systems, and harden your infrastructure against attacks.</li>
          <li>Monitoring & Threat Intelligence – Continuously monitor your systems and stay ahead of emerging threats.</li>
          <li>Response & Recovery – Provide rapid incident response and recovery solutions to minimize impact and restore operations.</li>
        </ul>

        <h4>Why Choose TechXplorers for Cyber Security?</h4>
        <ul>
          <li>Expertise & Experience – A team of certified cyber security professionals with proven experience across multiple sectors.</li>
          <li>Proactive Defense – Stay ahead of evolving threats with advanced monitoring and threat intelligence.</li>
          <li>Custom Security Solutions – Tailored strategies that align with your organization's size, goals, and regulatory requirements.</li>
          <li>Comprehensive Protection – End-to-end cyber security services covering networks, endpoints, cloud, and data.</li>
          <li>24/7 Support – Around-the-clock monitoring and support to ensure your systems remain secure at all times.</li>
        </ul>
        <div className="contact-container">
          <h2 className="headline">Want to know more or work with us?</h2>
          <a href="https://wa.me/919052990765 " target="_blank" rel="noopener noreferrer" className="contact-button">
            Contact Us
          </a>
          <span style={{ color: '#fff', margin: '0 10px', fontWeight: 'bold' }}>---- or ----</span>
          <button
            className="contact-button"
            style={{ marginTop: '15px', marginLeft: '15px', cursor: 'pointer' }}
            onClick={() => navigate('/services/apply', { state: { service: 'Cyber Security' } })}
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default CyberSecurity;