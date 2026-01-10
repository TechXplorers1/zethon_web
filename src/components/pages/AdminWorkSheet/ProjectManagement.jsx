import React, { useState, useEffect, useRef } from 'react';
import { database } from '../../../firebase';
import { ref, push, remove, update, get, query, limitToLast, set } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Container, Form, Button, Table, Card, Row, Col, Badge, Modal, Spinner } from 'react-bootstrap';

const CACHE_KEY = "admin_projects_cache";

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Web App',
    image: '',
    description: '',
    link: '',
    client: '',
    order: 0
  });

  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // --- HELPER: Update Global Timestamp ---
  // This tells the public page "Hey, data changed!"
  const updateGlobalTimestamp = async () => {
    try {
      const metaRef = ref(database, "metadata/projects_last_updated");
      await set(metaRef, Date.now());
    } catch (e) {
      console.error("Failed to update timestamp", e);
    }
  };

  // --- LOAD FUNCTION ---
  const loadProjects = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
          setProjects(JSON.parse(cachedData));
          return;
        }
      }

      const projectsRef = query(ref(database, "projects"), limitToLast(50));
      const snapshot = await get(projectsRef);

      if (!snapshot.exists()) {
        setProjects([]);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify([]));
        return;
      }

      const data = snapshot.val();
      const projectList = Object.keys(data).map(key => ({
        id: key,
        ...data[key],
      }));

      const sortedList = projectList.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 9999;
        const orderB = b.order !== undefined ? b.order : 9999;
        return orderA - orderB;
      });

      setProjects(sortedList);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(sortedList));

    } catch (err) {
      console.error("Error loading projects:", err);
    }
  };

  useEffect(() => {
    loadProjects(false);
  }, []);

  // --- DRAG AND DROP HANDLERS ---
  const handleSort = async () => {
    let _projects = [...projects];
    const draggedItemContent = _projects.splice(dragItem.current, 1)[0];
    _projects.splice(dragOverItem.current, 0, draggedItemContent);

    dragItem.current = null;
    dragOverItem.current = null;

    setProjects(_projects);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(_projects));

    const updates = {};
    _projects.forEach((project, index) => {
      updates[`projects/${project.id}/order`] = index;
    });

    try {
      await update(ref(database), updates);
      await updateGlobalTimestamp(); // <--- CRITICAL UPDATE
    } catch (error) {
      console.error("Error reordering:", error);
    }
  };

  // --- CRUD HANDLERS ---
  const handleShow = () => {
    setFormData({
      title: '',
      category: 'Web App',
      image: '',
      description: '',
      link: '',
      client: '',
      order: projects.length
    });
    setImageFile(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditId(null);
    setImageFile(null);
    setUploading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image && !imageFile) {
      alert("Please provide an Image URL or Upload an Image.");
      return;
    }

    setUploading(true);
    let finalImageUrl = formData.image;

    try {
      if (imageFile) {
        const imageRef = storageRef(storage, `project_images/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      const payload = {
        ...formData,
        image: finalImageUrl
      };

      if (isEditing) {
        const projectRef = ref(database, `projects/${editId}`);
        await update(projectRef, payload);
      } else {
        const projectsRef = ref(database, 'projects');
        await push(projectsRef, payload);
      }

      await updateGlobalTimestamp(); // <--- CRITICAL UPDATE
      await loadProjects(true);
      handleClose();

    } catch (error) {
      console.error("Error saving project:", error);
      alert("Error saving project: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (project) => {
    setFormData(project);
    setImageFile(null);
    setIsEditing(true);
    setEditId(project.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      const projectRef = ref(database, `projects/${id}`);
      await remove(projectRef);

      await updateGlobalTimestamp(); // <--- CRITICAL UPDATE
      await loadProjects(true);
    }
  };

  const getBadgeColor = (cat) => {
    switch (cat) {
      case 'Web App': return 'primary';
      case 'Mobile App': return 'success';
      case 'Digital Marketing': return 'warning';
      case 'Cyber Security': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Container fluid className="p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1" style={{ color: '#1f2937', fontWeight: '700' }}>Project Management</h3>
          <p className="text-muted mb-0">Drag and drop rows to rearrange your portfolio.</p>
        </div>
        <Button
          variant="primary"
          onClick={handleShow}
          className="d-flex align-items-center gap-2 shadow-sm px-4"
          style={{ borderRadius: '50px', fontWeight: '600' }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>+</span> Add New Project
        </Button>
      </div>

      <Card className="shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Table responsive hover className="mb-0 align-middle">
          <thead className="bg-light text-secondary">
            <tr style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th className="py-3 ps-4" style={{ width: '50px' }}>Sort</th>
              <th className="py-3">Image</th>
              <th className="py-3">Title / Client</th>
              <th className="py-3">Category</th>
              <th className="py-3">Link</th>
              <th className="py-3 text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length > 0 ? (
              projects.map((project, index) => (
                <tr
                  key={project.id}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'grab' }}
                  draggable
                  onDragStart={(e) => (dragItem.current = index)}
                  onDragEnter={(e) => (dragOverItem.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <td className="ps-4 text-center">
                    <div className="text-muted" style={{ fontSize: '1.2rem', cursor: 'grab' }} title="Drag to reorder">⋮⋮</div>
                  </td>
                  <td>
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                      <img
                        src={project.image}
                        alt={project.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/60?text=IMG' }}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold text-dark">{project.title}</div>
                    <small className="text-muted">{project.client || 'No Client Listed'}</small>
                  </td>
                  <td>
                    <Badge bg={getBadgeColor(project.category)} pill className="px-3 py-2 fw-normal">{project.category}</Badge>
                  </td>
                  <td>
                    {project.link ? (
                      <a href={project.link} target="_blank" rel="noreferrer" className="text-decoration-none text-primary small">Link &#8599;</a>
                    ) : <span className="text-muted small">-</span>}
                  </td>
                  <td className="text-end pe-4">
                    <Button
                      variant="light" size="sm" className="me-2 text-primary fw-bold"
                      onClick={() => handleEdit(project)}
                      style={{ backgroundColor: '#eff6ff', border: 'none' }}
                    >Edit</Button>
                    <Button
                      variant="light" size="sm" className="text-danger fw-bold"
                      onClick={() => handleDelete(project.id)}
                      style={{ backgroundColor: '#fef2f2', border: 'none' }}
                    >Delete</Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-5 text-muted">No projects added yet.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Modal show={showModal} onHide={handleClose} centered size="lg" backdrop="static">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">{isEditing ? 'Edit Project Details' : 'Add New Project'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small text-secondary">PROJECT TITLE</Form.Label>
                  <Form.Control type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. xyz.com" className="py-2" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small text-secondary">CATEGORY</Form.Label>
                  <Form.Select name="category" value={formData.category} onChange={handleChange} className="py-2">
                    <option>Web App</option><option>Website</option><option>Mobile App</option><option>Portfolio</option><option>Digital Marketing</option><option>Cyber Security</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small text-secondary">IMAGE (URL)</Form.Label>
                  <Form.Control type="text" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." disabled={!!imageFile} className="py-2" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small text-secondary">OR UPLOAD IMAGE</Form.Label>
                  <Form.Control type="file" accept="image/*" onChange={handleFileChange} className="py-2" />
                  {imageFile && <Form.Text className="text-success">File selected: {imageFile.name}</Form.Text>}
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small text-secondary">PROJECT LINK</Form.Label>
                  <Form.Control type="text" name="link" value={formData.link} onChange={handleChange} placeholder="https://..." className="py-2" />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small text-secondary">CLIENT NAME (Optional)</Form.Label>
                  <Form.Control type="text" name="client" value={formData.client} onChange={handleChange} placeholder="e.g. RetailGiant Co." className="py-2" />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold small text-secondary">DESCRIPTION</Form.Label>
                  <Form.Control as="textarea" rows={4} name="description" value={formData.description} onChange={handleChange} required className="py-2" />
                </Form.Group>
              </Col>
            </Row>
            <Form.Control type="hidden" name="order" value={formData.order} />

            <div className="d-flex justify-content-end gap-2 border-top pt-3">
              <Button variant="light" onClick={handleClose} disabled={uploading} className="px-4 fw-semibold text-secondary">← Go Back</Button>
              <Button variant="primary" type="submit" disabled={uploading} className="px-4 fw-bold">
                {uploading ? (<><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Uploading...</>) : (isEditing ? 'Save Changes' : 'Publish Project')}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ProjectManagement;