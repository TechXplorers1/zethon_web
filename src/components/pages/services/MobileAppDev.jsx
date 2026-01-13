import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import '../../../styles/ServiceLayout.css';

import img1 from '../../../assets/mobile1.png';
import CustomNavbar from '../../../components/Navbar';


const MobileAppDev = () => {
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
			<h2 className="section-title">Mobile Application Development</h2>

			{/* Single image display instead of carousel */}
			<div className="single-image-container">
				<img src={img1} alt="Mobile Application Development" className="service-image" />
			</div>

			<div className="service-description">
				<h4>Mobile Application Development Services: Android & IOS</h4>

				<p>Zethon Tech Pvt Ltd offers expert Android and iOS app development services, ensuring seamless, user-centric experiences across both platforms. Whether you need custom Android apps or innovative iOS solutions, our skilled developers are here to bring your ideas to life with unmatched quality and performance.</p>

				<h4>Android App Development</h4>
				<p>Android, developed by Google, powers a wide variety of smartphones. Zethon Tech Pvt Ltd provides expert Android app development services, creating high-quality, custom apps tailored to your business needs.</p>

				<h4>Android App Development Services:</h4>
				<p>Bluetooth Low Energy (BLE) Powered Devices
					Music and Video Apps
					Health and Fitness Apps
					Security Apps
					Location-based Apps
					GPS Tracking & Dispatch Apps
					Social Media Apps
					Custom Android App Development
					iOS App Development
					Apple's iOS platform is known for its seamless hardware-software integration, setting high benchmarks for mobile operating systems. Zethon Tech Pvt Ltd specializes in custom iPhone app development for iOS 15/iOS 16, delivering end-to-end solutions.</p>

				<h4>IOS App Development Services:</h4>
				<p>Bluetooth Low Energy (BLE) Powered Devices
					Music and Video Apps
					Health and Fitness Apps
					Security Apps
					Location-based Apps
					GPS Tracking & Dispatch Apps
					Social Media Apps
					Custom iOS App Development
					Our Team: Android & iOS Development Experts
					At Zethon Tech Pvt Ltd, we believe teamwork is the foundation of every great product. Our young, energetic, and skilled team is proficient in the latest technologies, creating apps that meet user preferences and business needs. Whether for Android or iOS, we prioritize intuitive design, functionality, and performance.</p>

				<h4>Why Choose Zethon Tech Pvt Ltd?</h4>
				<p>Expert Developers: Talented professionals skilled in both Android and iOS app development.
					Tailored Solutions: Custom-built apps to fit your business and user needs.
					Cutting-Edge Technologies: Leveraging the latest tools for scalable, secure, and future-proof apps.
					User-Centric Design: Focus on seamless user experience and beautiful, functional designs.
					Quality Assurance: Rigorous testing to ensure flawless app performance.
					Confidentiality: Full protection of your business idea with NDAs.
					Contact Us for Custom Android & iOS App Development
					Zethon Tech Pvt Ltd is your trusted partner for all mobile app development needs. Whether for Android or iOS, we’re here to help transform your idea into a high-performance app. Contact us today to start your project!</p>

				<div className="contact-container">
					<h2 className="headline">Want to know more or work with us?</h2>
					<a href="https://wa.me/919052990765" target="_blank" rel="noopener noreferrer" className="contact-button">
						Contact Us
					</a>
					<span style={{ color: '#fff', margin: '0 10px', fontWeight: 'bold' }}>---- or ----</span>
					<button
						className="contact-button"
						style={{ marginTop: '15px', marginLeft: '15px', cursor: 'pointer' }}
						onClick={() => navigate('/services/apply', { state: { service: 'Mobile Development' } })}
					>
						Apply Now
					</button>

				</div>
			</div>
		</div>
	);
};

export default MobileAppDev;