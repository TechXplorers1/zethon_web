import React, { useEffect } from 'react';
import '../../../styles/ServiceLayout.css';
import img1 from '../../../assets/mobile3.png';
import CustomNavbar from '../../../components/Navbar';
import { useNavigate } from 'react-router-dom';

const DigitalMarketing = () => {
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
      <h2 className="section-title">Digital Marketing</h2>

      {/* Single image display */}
      <div className="single-image-container">
        <img src={img1} alt="Digital Marketing" className="service-image" />
      </div>

      <div className="service-description">
        <h4>Our Digital Marketing Services</h4>
        <p>
          We provide a full suite of digital marketing services tailored to help businesses establish a strong online presence and achieve their marketing objectives.
        </p>

        <h4>Key Digital Marketing Solutions</h4>
        <ul>
          <li>Search Engine Optimization (SEO) – Improve your website's ranking on search engines to drive organic traffic.</li>
          <li>Pay-Per-Click Advertising (PPC) – Maximize ROI with targeted ad campaigns on Google, Bing, and social media platforms.</li>
          <li>Social Media Marketing (SMM) – Build brand awareness and customer engagement through strategic social media campaigns.</li>
          <li>Content Marketing – Develop high-quality content to attract, inform, and convert potential customers.</li>
          <li>Email Marketing – Drive customer retention and engagement with personalized email campaigns.</li>
          <li>Conversion Rate Optimization (CRO) – Optimize your website to improve user experience and boost conversions.</li>
          <li>Influencer & Affiliate Marketing – Leverage industry influencers and partners to expand your reach and credibility.</li>
          <li>Online Reputation Management (ORM) – Monitor and manage your brand's online presence to maintain a positive reputation.</li>
        </ul>

        <h4>Industries We Serve</h4>
        <p>We provide customized digital marketing strategies for businesses across multiple industries:</p>
        <ul>
          <li>E-Commerce & Retail</li>
          <li>Healthcare & Pharmaceuticals</li>
          <li>Finance & Banking</li>
          <li>Real Estate & Construction</li>
          <li>Education & Training</li>
          <li>Technology & SaaS</li>
          <li>Hospitality & Travel</li>
          <li>Automotive & Manufacturing</li>
        </ul>

        <h4>Our Digital Marketing Process</h4>
        <p>We follow a strategic and data-driven approach to deliver impactful digital marketing campaigns:</p>
        <ul>
          <li>Market Research & Analysis – Understanding your industry, competitors, and target audience.</li>
          <li>Strategy Development – Crafting a customized digital marketing plan based on business goals.</li>
          <li>Implementation & Execution – Launching marketing campaigns using industry best practices.</li>
          <li>Monitoring & Optimization – Analyzing performance and making data-backed improvements.</li>
          <li>Reporting & Insights – Providing detailed reports and insights for continuous growth.</li>
        </ul>

        <h4>Why Choose TechXplorers for Digital Marketing?</h4>
        <ul>
          <li>Expertise & Experience – A team of seasoned digital marketers with proven success in multiple industries.</li>
          <li>Custom Strategies – Tailored marketing solutions to align with your business goals and target audience.</li>
          <li>Data-Driven Approach – Leveraging analytics and insights to maximize campaign effectiveness.</li>
          <li>Multi-Channel Marketing – Integrated strategies across search, social media, content, and more.</li>
          <li>Transparent Reporting – Regular performance reports to track progress and optimize results.</li>
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
            onClick={() => navigate('/services/apply', { state: { service: 'Digital Marketing' } })}
          >
            Apply Now
          </button>

        </div>
      </div>
    </div>
  );
};

export default DigitalMarketing;