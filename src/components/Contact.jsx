import React, { useState } from 'react';
import '../styles/Contact.css';
import ContactImg from '../assets/Contact.png';
import MailImg from '../assets/Mail.png';
import LocationImg from '../assets/Location.png';
import CustomNavbar from './Navbar';
import Footer from './Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';


const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { name, email, subject, message } = formData;

    const whatsappMessage = `Name: ${name}%0AEmail: ${email}%0ASubject: ${subject}%0AMessage: ${message}`;
    const whatsappURL = `https://wa.me/919052990765?text=${whatsappMessage}`;

    window.open(whatsappURL, '_blank');
  };

  return (
    <div>
      <CustomNavbar />
      <br />
      <div className="contact-section" id="contact">
        <h2 className="contact-heading">Zethon Tech NAVIGATING THE FUTURE OF INNOVATION</h2>

        <div className="contact-info-cards">
          <div className="info-card">
            <img src={ContactImg} alt="Contact Icon" className="info-icon" />
            <p>+91 9390601802</p>
          </div>
          <div className="info-card">
            <img src={MailImg} alt="Mail Icon" className="info-icon" />
            <p>inquiries@techxplorers.in</p>
          </div>
          <div className="info-card">
            <img src={LocationImg} alt="Location Icon" className="info-icon" />
            <p>31 Windsor Ave, Vauxhall, NJ 07088, USA</p>
          </div>
          <div className="info-card">
            <img src={LocationImg} alt="Location Icon" className="info-icon" />
            <p>D.no-1/1361 , Srinagar Colony , <br />Rudrampeta, Anantapur, 515001</p>
          </div>
        </div>

        <div className="contact-main">
          <div className="map-container">
            <iframe
              title="Google Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241.23999546269226!2d77.58268941680078!3d14.665023969118186!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bb14b000831ea13%3A0x9ad7cc5f69a54e24!2sZethon%20Tech%20Private%20limited!5e0!3m2!1sen!2sin!4v1757744268810!5m2!1sen!2sin"
              width="100%"
              height="300"
              style={{ border: 0, marginRight: "50px" }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3023.9690887335846!2d-74.28930122409692!3d40.718696971392575!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c3ac4acad7a37d%3A0x3052338d763eab90!2s31%20Windsor%20Ave%2C%20Vauxhall%2C%20NJ%2007088%2C%20USA!5e0!3m2!1sen!2sin!4v1753409948177!5m2!1sen!2sin"
            width="100%"
              height="300"
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>

          <div className="form-container">
            <h3>CONNECT WITH ZETHON </h3>
            <p>Fill out your contact details below and our experts will be in touch</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="subject"
                placeholder="Your Subject"
                value={formData.subject}
                onChange={handleChange}
              />
              <textarea
                name="message"
                placeholder="Message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
              ></textarea>
              <button type="submit">
                <FontAwesomeIcon icon={faWhatsapp} style={{ fontSize: '24px', marginRight: '8px' }} />
                GET A RING BACK
              </button>

            </form>
          </div>
        </div>
        <Footer />
      </div>

    </div>
  );
};

export default Contact;