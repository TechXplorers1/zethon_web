import React, { useState, useEffect } from 'react';
import { database, storage } from '../../../firebase';
import { ref, push, serverTimestamp, remove, update, get, query, orderByChild, limitToLast } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Modal, Button, Form, Card, Badge, Spinner, Container, Row, Col } from 'react-bootstrap';

const AdsManagement = () => {
    // --- STATES ---
    const [newAd, setNewAd] = useState({
        title: '',
        message: '',
        imageUrl: '',
        linkUrl: '',
        buttonText: '',
        targetDate: new Date().toISOString().split('T')[0],
        type: 'popup',
    });

    const [imageFile, setImageFile] = useState(null);
    const [editImageFile, setEditImageFile] = useState(null);
    const [postedAds, setPostedAds] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [adToEdit, setAdToEdit] = useState(null);
    const [deleteAdKey, setDeleteAdKey] = useState(null);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

    // --- DATA FETCHING ---
    const loadAds = async () => {
        try {
            // Note: Ensure '.indexOn': ['createdAt'] is in your Firebase Rules
            const adsQuery = query(
                ref(database, "welcomeCards"),
                orderByChild("createdAt"),
                limitToLast(50)
            );

            const snapshot = await get(adsQuery);

            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));

                // Sort newest first (Javascript sort as backup)
                list.sort((a, b) => {
                    const dateA = a.createdAt || 0;
                    const dateB = b.createdAt || 0;
                    return dateB - dateA;
                });
                setPostedAds(list);
            } else {
                setPostedAds([]);
            }
        } catch (err) {
            console.error("Failed to load ads:", err);
        }
    };

    useEffect(() => {
        loadAds();
    }, []);

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewAd(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) setImageFile(e.target.files[0]);
    };

    const handleEditFileChange = (e) => {
        if (e.target.files[0]) setEditImageFile(e.target.files[0]);
    };

    const handlePostAd = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!newAd.title || !newAd.targetDate) {
            alert("Title and Target Date are required.");
            setLoading(false);
            return;
        }

        try {
            let finalImageUrl = newAd.imageUrl;

            // 1. Upload Image if file selected
            if (imageFile) {
                // Check file size (limit 2MB)
                if (imageFile.size > 2 * 1024 * 1024) {
                    throw new Error("File too large. Please upload an image smaller than 2MB.");
                }

                const imageStorageRef = storageRef(storage, `ad_images/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(imageStorageRef, imageFile);
                finalImageUrl = await getDownloadURL(snapshot.ref);
            }

            // 2. Save to Database
            await push(ref(database, 'welcomeCards'), {
                ...newAd,
                imageUrl: finalImageUrl,
                createdAt: serverTimestamp(),
            });

            // Reset Form & Reload
            setNewAd({
                title: '', message: '', imageUrl: '', linkUrl: '', buttonText: '',
                targetDate: new Date().toISOString().split('T')[0],
                type: 'popup'
            });
            setImageFile(null);
            setShowCreateModal(false);
            await loadAds();

        } catch (error) {
            console.error("Error posting ad:", error);
            if (error.code === 'storage/quota-exceeded') {
                alert("Storage Full: Cannot upload image. Upgrade plan or delete old files.");
            } else if (error.message.includes("File too large")) {
                alert(error.message);
            } else {
                alert("Failed to post ad. Check console for details.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Edit Handlers
    const handleEditClick = (ad) => {
        setAdToEdit(ad);
        setEditImageFile(null);
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setAdToEdit(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!adToEdit?.id) return;
        setLoading(true);

        try {
            let finalImageUrl = adToEdit.imageUrl;

            if (editImageFile) {
                if (editImageFile.size > 2 * 1024 * 1024) {
                    throw new Error("File too large. Please upload an image smaller than 2MB.");
                }
                const imageStorageRef = storageRef(storage, `ad_images/${Date.now()}_${editImageFile.name}`);
                const snapshot = await uploadBytes(imageStorageRef, editImageFile);
                finalImageUrl = await getDownloadURL(snapshot.ref);
            }

            await update(ref(database, `welcomeCards/${adToEdit.id}`), {
                title: adToEdit.title,
                message: adToEdit.message,
                imageUrl: finalImageUrl,
                linkUrl: adToEdit.linkUrl,
                buttonText: adToEdit.buttonText,
                targetDate: adToEdit.targetDate,
                type: adToEdit.type
            });

            setIsEditModalOpen(false);
            await loadAds();
        } catch (error) {
            console.error("Error updating ad:", error);
            if (error.code === 'storage/quota-exceeded') {
                alert("Storage Full: Cannot upload new image.");
            } else {
                alert("Update failed. Check console.");
            }
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id) => {
        setDeleteAdKey(id);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteAdKey) return;
        setLoading(true);
        try {
            await remove(ref(database, `welcomeCards/${deleteAdKey}`));
            setIsDeleteConfirmModalOpen(false);
            await loadAds();
        } catch (error) {
            console.error(error);
            alert("Delete failed.");
        } finally {
            setLoading(false);
            setDeleteAdKey(null);
        }
    };

    return (
        <Container fluid className="p-4" style={{ fontFamily: "'Segoe UI', sans-serif", backgroundColor: '#f8f9fa', minHeight: '100vh' }}>

            {/* --- HEADER SECTION --- */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <h2 style={{ color: '#1e293b', fontWeight: '700', margin: 0 }}>Ads Management</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Manage Dashboard Banners & Welcome Popups</p>
                </div>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setShowCreateModal(true)}
                    style={{ fontWeight: '600', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)' }}
                >
                    + Create New Ad
                </Button>
            </div>

            {/* --- ADS GRID --- */}
            <Row>
                <Col>
                    {postedAds.length === 0 ? (
                        <div className="text-center p-5 bg-white rounded shadow-sm border">
                            <h4 className="text-muted">No ads posted yet.</h4>
                            <p className="text-muted">Click "Create New Ad" to get started.</p>
                        </div>
                    ) : (
                        <Row xs={1} md={2} lg={3} xl={4} className="g-4">
                            {postedAds.map(ad => (
                                <Col key={ad.id}>
                                    <Card className="h-100 shadow-sm border-0" style={{ transition: 'transform 0.2s' }}>
                                        <div style={{ position: 'relative' }}>
                                            {ad.imageUrl ? (
                                                <Card.Img
                                                    variant="top"
                                                    src={ad.imageUrl}
                                                    loading="lazy"
                                                    style={{ height: '160px', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ height: '160px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                                    No Image
                                                </div>
                                            )}
                                            {ad.targetDate === new Date().toISOString().split('T')[0] && (
                                                <Badge bg="success" style={{ position: 'absolute', top: '10px', right: '10px' }}>ACTIVE TODAY</Badge>
                                            )}
                                            <Badge bg={ad.type === 'banner' ? 'info' : 'warning'} text="dark" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                                {ad.type === 'banner' ? 'BANNER' : 'POPUP'}
                                            </Badge>
                                        </div>

                                        <Card.Body className="d-flex flex-column">
                                            <Card.Title style={{ fontSize: '1.1rem', fontWeight: '600' }}>{ad.title}</Card.Title>
                                            <Card.Text className="text-muted small flex-grow-1" style={{ whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical' }}>
                                                {ad.message}
                                            </Card.Text>

                                            {ad.linkUrl && (
                                                <div className="mb-2">
                                                    <Badge bg="light" text="dark" className="border">
                                                        Btn: {ad.buttonText || 'Learn More'}
                                                    </Badge>
                                                </div>
                                            )}

                                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                                <small className="text-muted">Target: {ad.targetDate}</small>
                                                <div className="d-flex gap-2">
                                                    <Button variant="outline-primary" size="sm" onClick={() => handleEditClick(ad)}>Edit</Button>
                                                    <Button variant="outline-danger" size="sm" onClick={() => confirmDelete(ad.id)}>Delete</Button>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Col>
            </Row>

            {/* --- CREATE MODAL --- */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Create New Ad</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handlePostAd}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Ad Type</Form.Label>
                                    <Form.Select name="type" value={newAd.type} onChange={handleChange}>
                                        <option value="popup">Welcome Popup</option>
                                        <option value="banner">AD Carousel</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Target Date</Form.Label>
                                    <Form.Control type="date" name="targetDate" value={newAd.targetDate} onChange={handleChange} required />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Title</Form.Label>
                            <Form.Control type="text" name="title" placeholder="e.g., Seasonal Offer" value={newAd.title} onChange={handleChange} required />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Message</Form.Label>
                            <Form.Control as="textarea" rows={4} name="message" placeholder="Enter the content of your ad..." value={newAd.message} onChange={handleChange} />
                        </Form.Group>

                        {/* --- IMAGE UPLOAD SECTION --- */}
                        <Row className="mb-3 p-3 bg-light rounded border mx-1">
                            <Col md={12}>
                                <Form.Label className="fw-bold">Ad Image</Form.Label>

                                <Form.Group className="mb-2">
                                    <Form.Label className="text-muted small">Option 1: Upload Image File</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </Form.Group>

                                <div className="text-center text-muted my-2">- OR -</div>

                                <Form.Group>
                                    <Form.Label className="text-muted small">Option 2: Image URL</Form.Label>
                                    <Form.Control
                                        type="url"
                                        name="imageUrl"
                                        placeholder="https://example.com/image.jpg"
                                        value={newAd.imageUrl}
                                        onChange={handleChange}
                                        disabled={!!imageFile}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Link URL (Optional)</Form.Label>
                                    <Form.Control type="url" name="linkUrl" placeholder="Redirect link on click" value={newAd.linkUrl} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Link Text</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="buttonText"
                                        placeholder="e.g. Sign Up, Learn More"
                                        value={newAd.buttonText}
                                        onChange={handleChange}
                                    />
                                    <Form.Text className="text-muted">Defaults to "Learn More" if empty.</Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? <Spinner animation="border" size="sm" /> : 'Post Ad'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* --- EDIT MODAL --- */}
            <Modal show={isEditModalOpen} onHide={() => setIsEditModalOpen(false)} centered size="lg">
                <Modal.Header closeButton><Modal.Title>Edit Ad</Modal.Title></Modal.Header>
                <Form onSubmit={handleSaveEdit}>
                    <Modal.Body className="p-4">
                        {adToEdit && (
                            <>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Type</Form.Label>
                                            <Form.Select name="type" value={adToEdit.type} onChange={handleEditChange}>
                                                <option value="popup">Popup</option>
                                                <option value="banner">Banner</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Target Date</Form.Label>
                                            <Form.Control type="date" name="targetDate" value={adToEdit.targetDate} onChange={handleEditChange} required />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Form.Group className="mb-3">
                                    <Form.Label>Title</Form.Label>
                                    <Form.Control type="text" name="title" value={adToEdit.title} onChange={handleEditChange} required />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Message</Form.Label>
                                    <Form.Control as="textarea" rows={4} name="message" value={adToEdit.message} onChange={handleEditChange} />
                                </Form.Group>

                                {/* --- EDIT IMAGE UPLOAD --- */}
                                <Row className="mb-3 p-3 bg-light rounded border mx-1">
                                    <Col md={12}>
                                        <Form.Label className="fw-bold">Update Image</Form.Label>

                                        <Form.Group className="mb-2">
                                            <Form.Label className="text-muted small">Upload New Image</Form.Label>
                                            <Form.Control
                                                type="file"
                                                accept="image/*"
                                                onChange={handleEditFileChange}
                                            />
                                        </Form.Group>

                                        <div className="text-center text-muted my-2">- OR -</div>

                                        <Form.Group>
                                            <Form.Label className="text-muted small">Image URL</Form.Label>
                                            <Form.Control
                                                type="url"
                                                name="imageUrl"
                                                value={adToEdit.imageUrl}
                                                onChange={handleEditChange}
                                                disabled={!!editImageFile}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Link URL</Form.Label>
                                            <Form.Control type="url" name="linkUrl" value={adToEdit.linkUrl} onChange={handleEditChange} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Button Text</Form.Label>
                                            <Form.Control type="text" name="buttonText" value={adToEdit.buttonText} onChange={handleEditChange} placeholder="Defaults to Learn More" />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* --- DELETE CONFIRM MODAL --- */}
            <Modal show={isDeleteConfirmModalOpen} onHide={() => setIsDeleteConfirmModalOpen(false)} centered>
                <Modal.Header closeButton><Modal.Title className="text-danger">Confirm Delete</Modal.Title></Modal.Header>
                <Modal.Body>Are you sure you want to delete this ad? This action cannot be undone.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setIsDeleteConfirmModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} disabled={loading}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdsManagement;