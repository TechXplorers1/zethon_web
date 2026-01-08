import React, { useState, useEffect } from 'react';

const DepartmentManagement = () => {
  // --- State required for Department Management ---

  // Department Management States
  const [departments, setDepartments] = useState([
    { id: 1, name: 'Management', description: 'Executive and senior management team', head: 'Sarah Wilson', employees: 5, status: 'active', createdDate: '15/01/2023' },
    { id: 2, name: 'Development', description: 'Software development and engineering', head: 'Michael Johnson', employees: 12, status: 'active', createdDate: '15/01/2023' },
    { id: 3, name: 'Design', description: 'UI/UX design and creative services', head: 'Not assigned', employees: 6, status: 'active', createdDate: '15/01/2023' },
    { id: 4, name: 'Marketing', description: 'Marketing and brand management', head: 'Not assigned', employees: 8, status: 'active', createdDate: '15/01/2023' },
    { id: 5, name: 'Sales', description: 'Sales and business development', head: 'Not assigned', employees: 10, status: 'active', createdDate: '15/01/2023' },
    { id: 6, name: 'Operations', description: 'Operations and process management', head: 'Not assigned', employees: 7, status: 'active', createdDate: '15/01/2023' },
    { id: 7, name: 'Finance', description: 'Financial planning and accounting', head: 'Not assigned', employees: 4, status: 'active', createdDate: '15/01/2023' },
    { id: 8, name: 'Support', description: 'Customer support and service', head: 'Not assigned', employees: 9, status: 'active', createdDate: '15/01/2023' },
    { id: 9, name: 'Quality Assurance', description: 'Quality testing and assurance', head: 'Not assigned', employees: 5, status: 'active', createdDate: '15/01/2023' },
    { id: 10, name: 'Tech Placement', description: 'Technology recruitment and placement', head: 'Michael Johnson', employees: 8, status: 'active', createdDate: '15/01/2023' },
    { id: 11, name: 'HR', description: 'Human resources and talent management', head: 'Not assigned', employees: 3, status: 'active', createdDate: '15/01/2023' },
    { id: 12, name: 'External', description: 'External clients and partners', head: 'Not assigned', employees: 0, status: 'active', createdDate: '15/01/2023' },
  ]);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');

  // Employee state is needed to manage assignments
  const [employees, setEmployees] = useState([
     { 
        id: 1,name: 'Admin employee', email: 'admin@techxplorers.in', roles: ['admin', 'active', 'Management'],
        firstName: "Admin", lastName: "employee",
    },
    { 
        id: 2, roles: ['manager', 'active', 'Management'], name: 'Sarah Wilson', email: 'sarah.wilson@example.com',
        firstName: "Sarah", lastName: "Wilson",
    },  
    { 
        id: 3, roles: ['team lead', 'active', 'Tech Placement'], name: 'Michael Johnson', email: 'michael.j@example.com',
        firstName: "Michael", lastName: "Johnson",
    },
    { 
        id: 4, roles: ['asset manager', 'active', 'Operations'], name: 'Asset Manager',
        firstName: "Asset", lastName: "Manager",
    },
    { 
        id: 5, roles: ['employee', 'active', 'Development'], name: 'John Employee',
        firstName: "John", lastName: "Employee",
    },   
  ]);

  // Department Modals States
  const [isEditDepartmentModalOpen, setIsEditDepartmentModalOpen] = useState(false);
  const [currentDepartmentToEdit, setCurrentDepartmentToEdit] = useState(null);
  const [isDeleteDepartmentConfirmModalOpen, setIsDeleteDepartmentConfirmModalOpen] = useState(false);
  const [departmentToDeleteId, setDepartmentToDeleteId] = useState(null);
  const [isCreateDepartmentModalOpen, setIsCreateDepartmentModalOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    head: 'Not assigned',
    status: 'active',
  });
  const [isDepartmentDetailsModalOpen, setIsDepartmentDetailsModalOpen] = useState(false);
  const [selectedDepartmentForDetails, setSelectedDepartmentForDetails] = useState(null);
  const [employeesInSelectedDepartment, setEmployeesInSelectedDepartment] = useState([]);
  const [employeesToAddInDepartment, setEmployeesToAddInDepartment] = useState([]);
  const [availableEmployeesForDepartment, setAvailableEmployeesForDepartment] = useState([]);
  const [isAddEmployeeToDepartmentModalOpen, setIsAddEmployeeToDepartmentModalOpen] = useState(false);
  const [employeeToAddToDepartment, setEmployeeToAddToDepartment] = useState('');
  
  // Generic Confirmation Modal States
  const [isConfirmUpdateModalOpen, setIsConfirmUpdateModalOpen] = useState(false);
  const [confirmUpdateMessage, setConfirmUpdateMessage] = useState('');
  const [confirmActionType, setConfirmActionType] = useState(null);
  const [pendingDepartmentUpdate, setPendingDepartmentUpdate] = useState(null);
  const [departmentToDeleteDetails, setDepartmentToDeleteDetails] = useState(null);

  // --- Department Management Handlers ---

  const handleDepartmentSearchChange = (event) => {
    setDepartmentSearchTerm(event.target.value);
  };

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(departmentSearchTerm.toLowerCase()) ||
    dept.description.toLowerCase().includes(departmentSearchTerm.toLowerCase()) ||
    dept.head.toLowerCase().includes(departmentSearchTerm.toLowerCase())
  );

  // Department Edit Handlers
  const handleEditDepartmentClick = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    if (department) {
      const currentEmployeesInDept = employees.filter(emp =>
        emp.roles.includes(department.name.toLowerCase())
      );
      setEmployeesInSelectedDepartment(currentEmployeesInDept);
      
      const available = employees.filter(emp => !emp.roles.includes(department.name.toLowerCase()));
      setAvailableEmployeesForDepartment(available);

      setCurrentDepartmentToEdit({ ...department });
      setIsEditDepartmentModalOpen(true);
    }
  };

  const handleCloseEditDepartmentModal = () => {
    setIsEditDepartmentModalOpen(false);
    setCurrentDepartmentToEdit(null);
    setEmployeesToAddInDepartment([]);
    setAvailableEmployeesForDepartment([]);
  };

  const handleEditDepartmentChange = (e) => {
    const { name, value } = e.target;
    setCurrentDepartmentToEdit(prevDept => ({ ...prevDept, [name]: value }));
  };

  const handleAddEmployeeToDepartment = (employeeId) => {
      const employee = employees.find(emp => emp.id === parseInt(employeeId));
      if(employee && currentDepartmentToEdit) {
          // Add to department
          setEmployeesInSelectedDepartment(prev => [...prev, employee]);
          // Remove from available
          setAvailableEmployeesForDepartment(prev => prev.filter(e => e.id !== employee.id));
      }
  };
  
  const handleRemoveEmployeeFromDepartment = (employeeId) => {
      const employee = employees.find(emp => emp.id === employeeId);
      if(employee && currentDepartmentToEdit) {
          // Remove from department
          setEmployeesInSelectedDepartment(prev => prev.filter(e => e.id !== employee.id));
          // Add back to available
          setAvailableEmployeesForDepartment(prev => [...prev, employee]);
      }
  };

  const handleUpdateDepartment = (e) => {
    e.preventDefault();
    setPendingDepartmentUpdate({
        ...currentDepartmentToEdit,
        employeeIds: employeesInSelectedDepartment.map(e => e.id)
    });
    setConfirmUpdateMessage(`Are you sure you want to update department '${currentDepartmentToEdit.name}'?`);
    setIsConfirmUpdateModalOpen(true);
    setConfirmActionType('departmentUpdate');
  };

  const confirmDepartmentUpdate = () => {
    setDepartments(prev => prev.map(dept => 
      dept.id === pendingDepartmentUpdate.id ? { ...pendingDepartmentUpdate, employees: pendingDepartmentUpdate.employeeIds.length } : dept
    ));
    
    // Update employee roles
    const deptNameLower = pendingDepartmentUpdate.name.toLowerCase();
    setEmployees(prev => prev.map(emp => {
        const isNowInDept = pendingDepartmentUpdate.employeeIds.includes(emp.id);
        const wasInDept = emp.roles.includes(deptNameLower);

        if(isNowInDept && !wasInDept) {
            // Add department role
            return {...emp, roles: [...emp.roles.filter(r => !departmentOptions.includes(r)), deptNameLower]};
        }
        if(!isNowInDept && wasInDept) {
            // Remove department role
            return {...emp, roles: emp.roles.filter(r => r !== deptNameLower)};
        }
        return emp;
    }));

    handleCloseEditDepartmentModal();
    setIsConfirmUpdateModalOpen(false);
    setPendingDepartmentUpdate(null);
  };

  // Department Delete Handlers
  const handleDeleteDepartmentClick = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    setDepartmentToDeleteDetails(department);
    setConfirmUpdateMessage(`Are you sure you want to delete the department '${department.name}'? This action cannot be undone.`);
    setIsConfirmUpdateModalOpen(true);
    setConfirmActionType('departmentDelete');
  };

  const confirmDepartmentDelete = () => {
    setDepartments(departments.filter(dept => dept.id !== departmentToDeleteDetails.id));
    setEmployees(prev => prev.map(emp => ({
      ...emp,
      roles: emp.roles.filter(role => role !== departmentToDeleteDetails.name.toLowerCase())
    })));
    setIsConfirmUpdateModalOpen(false);
    setDepartmentToDeleteDetails(null);
  };

  // Department Details Modal Handlers
  const handleViewDepartmentDetails = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    if (department) {
      const employeesInDept = employees.filter(emp =>
        emp.roles.includes(department.name.toLowerCase())
      );
      setSelectedDepartmentForDetails(department);
      setEmployeesInSelectedDepartment(employeesInDept);
      setIsDepartmentDetailsModalOpen(true);
    }
  };

  const handleCloseDepartmentDetailsModal = () => {
    setIsDepartmentDetailsModalOpen(false);
    setSelectedDepartmentForDetails(null);
    setEmployeesInSelectedDepartment([]);
  };

  // Create Department Modal Handlers
  const handleCreateDepartmentClick = () => {
    setIsCreateDepartmentModalOpen(true);
  };

  const handleCloseCreateDepartmentModal = () => {
    setIsCreateDepartmentModalOpen(false);
    setNewDepartment({ name: '', description: '', head: 'Not assigned', status: 'active' });
  };

  const handleNewDepartmentChange = (e) => {
    const { name, value } = e.target;
    setNewDepartment(prevDept => ({ ...prevDept, [name]: value }));
  };

  const handleSaveNewDepartment = (e) => {
    e.preventDefault();
    const newDeptId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) + 1 : 1;
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    setDepartments(prev => [
      ...prev,
      {
        id: newDeptId,
        ...newDepartment,
        employees: 0,
        createdDate: formattedDate,
      }
    ]);
    handleCloseCreateDepartmentModal();
  };

  const departmentOptions = departments.map(d => d.name);
  departmentOptions.unshift('No department assigned');
  
  const headOfDepartmentOptions = ['Not assigned', ...employees.filter(e => e.roles.includes('manager') || e.roles.includes('team lead')).map(e => e.name)];
  const departmentStatusOptions = ['active', 'inactive', 'pending'];


  return (
    <div className="ad-body-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        :root {
            --bg-body: #f3f4f6;
            --bg-card: #ffffff;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --border-color: #e5e7eb;
            --shadow-color-1: rgba(0, 0, 0, 0.05);
            --shadow-color-3: rgba(0, 0, 0, 0.04);
            --modal-overlay-bg: rgba(0, 0, 0, 0.5);
            --modal-bg: #ffffff;
            --modal-border: #e5e7eb;
            --modal-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
            --modal-title-color: #1f2937;
            --modal-subtitle-color: #6b7280;
            --modal-close-btn-color: #6b7280;
            --modal-close-btn-hover: #1f2937;
            --modal-input-bg: #ffffff;
            --modal-input-border: #d1d5db;
            --modal-input-text: #1f2937;
            --modal-focus-border: #2563eb;
            --modal-label-color: #374151;
            --modal-create-btn-bg: #2563eb;
            --modal-create-btn-text: #ffffff;
            --modal-create-btn-hover: #1d4ed8;
            --confirm-modal-danger-btn-bg: #EF4444;
            --confirm-modal-danger-btn-hover: #DC2626;
            --confirm-modal-cancel-btn-bg: #e5e7eb;
            --confirm-modal-cancel-btn-text: #4b5563;
            --confirm-modal-cancel-btn-hover: #d1d5db;
            --dept-card-icon-bg-1: #e0f2fe;
            --dept-card-icon-color-1: #2563eb;
            --dept-card-icon-bg-2: #e8f5e9;
            --dept-card-icon-color-2: #4CAF50;
            --dept-card-icon-bg-3: #f3e5f5;
            --dept-card-icon-color-3: #9C27B0;
            --dept-create-btn-bg: #2563eb;
            --dept-create-btn-hover: #1d4ed8;
            --dept-create-btn-text: #ffffff;
            --dept-search-input-bg: #ffffff;
            --dept-search-input-border: #d1d5db;
            --dept-table-header-bg: #f9fafb;
            --dept-table-header-text: #6b7280;
            --dept-table-row-border: #e5e7eb;
            --dept-table-row-hover-bg: #f9fafb;
            --dept-active-tag-bg: #E8F5E9;
            --dept-active-tag-text: #4CAF50;
            --action-btn-border: #e5e7eb;
            --action-btn-text: #4b5563;
            --action-btn-hover-bg: #f9fafb;
            --delete-btn-bg: #EF4444;
            --delete-btn-text: #ffffff;
            --delete-btn-hover-bg: #DC2626;
        }
        .ad-body-container {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-body);
            min-height: 100vh;
            color: var(--text-primary);
        }
        .department-management-container {
            padding: 1.5rem;
        }
        .department-management-box {
            background-color: var(--bg-card);
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px -1px var(--shadow-color-1), 0 2px 4px -1px var(--shadow-color-3);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
        }
        .department-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .department-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .create-department-btn {
            padding: 0.6rem 1rem;
            background-color: var(--dept-create-btn-bg);
            color: var(--dept-create-btn-text);
            border-radius: 0.5rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
        }
        .department-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .department-stat-card {
            background-color: var(--bg-card);
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid var(--border-color);
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .department-stat-card-icon-wrapper {
            border-radius: 9999px;
            padding: 0.75rem;
            font-size: 1.5rem;
        }
        .department-stat-card-icon-wrapper.total { background-color: var(--dept-card-icon-bg-1); color: var(--dept-card-icon-color-1); }
        .department-stat-card-icon-wrapper.active { background-color: var(--dept-card-icon-bg-2); color: var(--dept-card-icon-color-2); }
        .department-stat-card-icon-wrapper.employees { background-color: var(--dept-card-icon-bg-3); color: var(--dept-card-icon-color-3); }
        .department-stat-card-value { font-size: 1.875rem; font-weight: 700; }
        .department-stat-card-label { font-size: 0.875rem; color: var(--text-secondary); }
        .department-search-input {
            padding: 0.6rem 1rem;
            border: 1px solid var(--dept-search-input-border);
            border-radius: 0.5rem;
            background-color: var(--dept-search-input-bg);
            width: 100%;
            max-width: 400px;
            margin-bottom: 1.5rem;
        }
        .department-table-container { overflow-x: auto; }
        .department-table { width: 100%; border-collapse: collapse; }
        .department-table th, .department-table td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
        .department-table thead { background-color: var(--dept-table-header-bg); }
        .department-table th { font-weight: 600; color: var(--dept-table-header-text); }
        .department-table tbody tr:hover { background-color: var(--dept-table-row-hover-bg); }
        .department-table .status-tag { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; background-color: var(--dept-active-tag-bg); color: var(--dept-active-tag-text); }
        .department-table .action-buttons { display: flex; gap: 0.5rem; }
        .action-btn { padding: 0.4rem 0.7rem; border: 1px solid var(--action-btn-border); border-radius: 0.5rem; background-color: transparent; color: var(--action-btn-text); cursor: pointer; }
        .delete-btn { background-color: var(--delete-btn-bg); color: var(--delete-btn-text); border-color: var(--delete-btn-bg); }
        
        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--modal-overlay-bg); display: flex; justify-content: center; align-items: center; z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.3s ease; }
        .modal-overlay.open { opacity: 1; visibility: visible; }
        .modal-content { background-color: var(--modal-bg); border-radius: 0.75rem; box-shadow: var(--modal-shadow); width: 90%; max-width: 600px; padding: 1.5rem; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .modal-title { font-size: 1.25rem; font-weight: 600; color: var(--modal-title-color); }
        .modal-subtitle { font-size: 0.875rem; color: var(--modal-subtitle-color); margin-top: 0.25rem; }
        .modal-close-btn { background: none; border: none; font-size: 1.5rem; color: var(--modal-close-btn-color); cursor: pointer; }
        .modal-form { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        @media (min-width: 640px) { .modal-form { grid-template-columns: 1fr 1fr; } .modal-form-full-width { grid-column: 1 / -1; } }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-label { font-size: 0.875rem; font-weight: 500; color: var(--modal-label-color); }
        .form-input, .form-select { padding: 0.75rem 1rem; border: 1px solid var(--modal-input-border); border-radius: 0.5rem; width: 100%; box-sizing: border-box; }
        .modal-footer { margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; }
        .create-employee-btn { padding: 0.75rem 1.5rem; background-color: var(--modal-create-btn-bg); color: var(--modal-create-btn-text); border-radius: 0.5rem; font-weight: 600; border: none; cursor: pointer; }
        .confirm-modal-buttons { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
        .confirm-cancel-btn { padding: 0.75rem 1.5rem; background-color: var(--confirm-modal-cancel-btn-bg); color: var(--confirm-modal-cancel-btn-text); border-radius: 0.5rem; font-weight: 500; border: none; cursor: pointer; }
        .confirm-delete-btn { padding: 0.75rem 1.5rem; background-color: var(--confirm-modal-danger-btn-bg); color: var(--delete-btn-text); border-radius: 0.5rem; font-weight: 600; border: none; cursor: pointer; }
        
        /* Department Details & Edit Modal Specifics */
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .detail-item { display: flex; flex-direction: column; }
        .detail-label { font-size: 0.85rem; color: var(--text-secondary); }
        .detail-value { font-size: 1rem; font-weight: 500; }
        .employees-list-section { margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; }
        .employees-list-section h4 { font-size: 1.1rem; margin-bottom: 1rem; }
        .employees-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem; }
        .employee-list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border-color); }
        .employee-list-item:last-child { border-bottom: none; }
        .edit-department-modal-employees { grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .employee-selection-box { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .employee-list-scroll { max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; }
        .employee-list-item-manage { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--border-color); }
        .employee-list-item-manage button { background-color: #2563eb; color: white; border: none; border-radius: 6px; padding: 0.3rem 0.6rem; cursor: pointer; }
        .employee-list-item-manage button.remove { background-color: #EF4444; }
      `}
      </style>
      <main>
        <div className="department-management-container">
          <div className="department-management-box">
            <div className="department-header">
              <h2 className="department-title">Department Management</h2>
              <button className="create-department-btn" onClick={handleCreateDepartmentClick}>Create Department</button>
            </div>
            <div className="department-stats-grid">
              <div className="department-stat-card">
                <div className="department-stat-card-icon-wrapper total">T</div>
                <div>
                  <div className="department-stat-card-value">{departments.length}</div>
                  <div className="department-stat-card-label">Total Departments</div>
                </div>
              </div>
              <div className="department-stat-card">
                <div className="department-stat-card-icon-wrapper active">A</div>
                <div>
                  <div className="department-stat-card-value">{departments.filter(d => d.status === 'active').length}</div>
                  <div className="department-stat-card-label">Active Departments</div>
                </div>
              </div>
              <div className="department-stat-card">
                <div className="department-stat-card-icon-wrapper employees">E</div>
                <div>
                  <div className="department-stat-card-value">{employees.length}</div>
                  <div className="department-stat-card-label">Total Employees</div>
                </div>
              </div>
            </div>
            <input 
              type="text" 
              placeholder="Search departments..." 
              className="department-search-input" 
              value={departmentSearchTerm} 
              onChange={handleDepartmentSearchChange} 
            />
            <div className="department-table-container">
              <table className="department-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Description</th>
                    <th>Head</th>
                    <th>Employees</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map(dept => (
                    <tr key={dept.id}>
                      <td>{dept.name}</td>
                      <td>{dept.description}</td>
                      <td>{dept.head}</td>
                      <td>{dept.employees}</td>
                      <td><span className="status-tag">{dept.status}</span></td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn" onClick={() => handleViewDepartmentDetails(dept.id)}>View</button>
                          <button className="action-btn" onClick={() => handleEditDepartmentClick(dept.id)}>Edit</button>
                          <button className="action-btn delete-btn" onClick={() => handleDeleteDepartmentClick(dept.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Create Department Modal */}
      {isCreateDepartmentModalOpen && (
        <div className="modal-overlay open">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Create New Department</h3>
                <p className="modal-subtitle">Add a new department to the organization.</p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseCreateDepartmentModal}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={handleSaveNewDepartment}>
              <div className="form-group modal-form-full-width">
                <label htmlFor="name" className="form-label">Department Name *</label>
                <input type="text" id="name" name="name" className="form-input" value={newDepartment.name} onChange={handleNewDepartmentChange} required />
              </div>
              <div className="form-group modal-form-full-width">
                <label htmlFor="description" className="form-label">Description</label>
                <input type="text" id="description" name="description" className="form-input" value={newDepartment.description} onChange={handleNewDepartmentChange} />
              </div>
              <div className="form-group">
                <label htmlFor="head" className="form-label">Head of Department</label>
                <select id="head" name="head" className="form-select" value={newDepartment.head} onChange={handleNewDepartmentChange}>
                  {headOfDepartmentOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status" className="form-label">Status</label>
                <select id="status" name="status" className="form-select" value={newDepartment.status} onChange={handleNewDepartmentChange}>
                  {departmentStatusOptions.map(option => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                </select>
              </div>
              <div className="modal-footer modal-form-full-width">
                <button type="button" className="confirm-cancel-btn" onClick={handleCloseCreateDepartmentModal}>Cancel</button>
                <button type="submit" className="create-employee-btn">Create Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Details Modal */}
      {isDepartmentDetailsModalOpen && selectedDepartmentForDetails && (
        <div className="modal-overlay open">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Department Details: {selectedDepartmentForDetails.name}</h3>
              <button className="modal-close-btn" onClick={handleCloseDepartmentDetailsModal}>&times;</button>
            </div>
            <div className="details-grid">
              <div className="detail-item"><span className="detail-label">Description</span><span className="detail-value">{selectedDepartmentForDetails.description}</span></div>
              <div className="detail-item"><span className="detail-label">Head</span><span className="detail-value">{selectedDepartmentForDetails.head}</span></div>
              <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{selectedDepartmentForDetails.status}</span></div>
              <div className="detail-item"><span className="detail-label">Created Date</span><span className="detail-value">{selectedDepartmentForDetails.createdDate}</span></div>
            </div>
            <div className="employees-list-section">
              <h4>Employees ({employeesInSelectedDepartment.length})</h4>
              <div className="employees-list">
                {employeesInSelectedDepartment.length > 0 ? employeesInSelectedDepartment.map(emp => (
                  <div key={emp.id} className="employee-list-item"><span>{emp.name}</span></div>
                )) : <p>No employees in this department.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Department Modal */}
      {isEditDepartmentModalOpen && currentDepartmentToEdit && (
        <div className="modal-overlay open">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Department: {currentDepartmentToEdit.name}</h3>
              <button className="modal-close-btn" onClick={handleCloseEditDepartmentModal}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={handleUpdateDepartment}>
              <div className="form-group modal-form-full-width"><label>Name</label><input type="text" name="name" value={currentDepartmentToEdit.name} onChange={handleEditDepartmentChange} /></div>
              <div className="form-group modal-form-full-width"><label>Description</label><input type="text" name="description" value={currentDepartmentToEdit.description} onChange={handleEditDepartmentChange} /></div>
              <div className="form-group"><label>Head</label><select name="head" value={currentDepartmentToEdit.head} onChange={handleEditDepartmentChange}>{headOfDepartmentOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="form-group"><label>Status</label><select name="status" value={currentDepartmentToEdit.status} onChange={handleEditDepartmentChange}>{departmentStatusOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="edit-department-modal-employees modal-form-full-width">
                <h4>Manage Employees</h4>
                <div className="employee-selection-box">
                    <div>
                        <h5>Employees in Department ({employeesInSelectedDepartment.length})</h5>
                        <div className="employee-list-scroll">
                            {employeesInSelectedDepartment.map(emp => (
                                <div key={emp.id} className="employee-list-item-manage">
                                    <span>{emp.name}</span>
                                    <button type="button" className="remove" onClick={() => handleRemoveEmployeeFromDepartment(emp.id)}>Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h5>Available Employees ({availableEmployeesForDepartment.length})</h5>
                        <div className="employee-list-scroll">
                            {availableEmployeesForDepartment.map(emp => (
                                <div key={emp.id} className="employee-list-item-manage">
                                    <span>{emp.name}</span>
                                    <button type="button" onClick={() => handleAddEmployeeToDepartment(emp.id)}>Add</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
              <div className="modal-footer modal-form-full-width">
                  <button type="button" className="confirm-cancel-btn" onClick={handleCloseEditDepartmentModal}>Cancel</button>
                  <button type="submit" className="create-employee-btn">Update Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* Generic Confirmation Modal */}
      {isConfirmUpdateModalOpen && (
        <div className="modal-overlay open">
          <div className="modal-content">
            <div className="modal-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 className="modal-title">Confirm Action</h3>
                <p className="modal-subtitle">{confirmUpdateMessage}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsConfirmUpdateModalOpen(false)}>&times;</button>
            </div>
            <div className="confirm-modal-buttons">
              <button type="button" className="confirm-cancel-btn" onClick={() => setIsConfirmUpdateModalOpen(false)}>Cancel</button>
              {confirmActionType === 'departmentUpdate' && (
                <button type="button" className="create-employee-btn" onClick={confirmDepartmentUpdate}>Confirm Update</button>
              )}
              {confirmActionType === 'departmentDelete' && (
                <button type="button" className="confirm-delete-btn" onClick={confirmDepartmentDelete}>Confirm Delete</button>
              )}
              {confirmActionType === 'employeeUpdate' && (
                <button type="button" className="create-employee-btn" onClick={confirmEmployeeUpdate}>Confirm Update</button>
              )}
              {confirmActionType === 'employeeDelete' && (
                <button type="button" className="confirm-delete-btn" onClick={confirmEmployeeDelete}>Confirm Delete</button>
              )}
              {confirmActionType === null && ( // For "no changes" message
                <button type="button" className="create-employee-btn" onClick={() => setIsConfirmUpdateModalOpen(false)}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
