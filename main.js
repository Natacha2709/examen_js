// Configuration de l'API
const API_BASE_URL = 'https://stn-examen-ctd5q6-bfec83-77-237-241-121.traefik.me';

// Variables globales
let users = [];
let tasks = [];
let messages = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadAllData();
});

// FONCTIONS D'INITIALISATION
function initializeApp() {
    // Compteur de caractères pour les messages
    const messageContent = document.getElementById('messageContent');
    const messageCounter = document.getElementById('messageCounter');
    
    if (messageContent && messageCounter) {
        messageContent.addEventListener('input', function() {
            messageCounter.textContent = this.value.length;
        });
    }
}

function setupEventListeners() {
    // Formulaire utilisateurs
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    
    // Formulaire tâches
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
    
    // Formulaire messages
    document.getElementById('messageForm').addEventListener('submit', handleMessageSubmit);
    
    // Événements des onglets
    document.querySelectorAll('a[data-bs-toggle="pill"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', handleTabChange);
    });
}

// FONCTIONS UTILITAIRES

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    const alertClass = `alert-${type === 'error' ? 'danger' : type}`;
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show slide-in" role="alert">
            <i class="fas fa-${icons[type]}"></i>
            <strong>${message}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    notification.innerHTML = alertHtml;
    
    // Auto-fermeture après 5 secondes
    setTimeout(() => {
        const alert = notification.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.issues?.[0]?.message || 
                              errorData.message || 
                              `Erreur HTTP ${response.status}`;
            } catch {
                errorMessage = `Erreur HTTP ${response.status}`;
            }
            throw new Error(errorMessage);
        }
        
        // Pour les DELETE, pas de contenu JSON
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erreur API:', error);
        throw error;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInitials(name) {
    return name
        .split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
}

// TEST DE CONNEXION

async function testConnection() {
    const statusElement = document.getElementById('connectionStatus');
    
    try {
        statusElement.textContent = 'Test...';
        statusElement.className = 'badge bg-warning';
        
        await apiRequest('/users');
        
        statusElement.textContent = 'Connecté';
        statusElement.className = 'badge bg-success';
        showNotification('Connexion à l\'API réussie !', 'success');
    } catch (error) {
        statusElement.textContent = 'Erreur';
        statusElement.className = 'badge bg-danger';
        showNotification(`Erreur de connexion: ${error.message}`, 'error');
    }
}

// GESTION DES UTILISATEURS

async function loadUsers() {
    const loading = document.getElementById('usersLoading');
    const usersList = document.getElementById('usersList');
    const usersCount = document.getElementById('usersCount');
    
    loading.classList.add('show');
    usersList.innerHTML = '';
    
    try {
        users = await apiRequest('/users');
        displayUsers(users);
        updateUserSelect(users);
        updateStats();
        
        if (usersCount) {
            usersCount.textContent = users.length;
        }
    } catch (error) {
        usersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Erreur de chargement</h5>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        loading.classList.remove('show');
    }
}

function displayUsers(usersData) {
    const usersList = document.getElementById('usersList');
    
    if (!usersData || usersData.length === 0) {
        usersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h5>Aucun utilisateur</h5>
                <p>Commencez par créer votre premier utilisateur</p>
            </div>
        `;
        return;
    }
    
    const usersHtml = usersData.map(user => `
        <div class="user-item fade-in">
            <div class="d-flex align-items-center">
                <div class="user-avatar">
                    ${getInitials(user.name)}
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1 fw-bold">${user.name}</h6>
                    <p class="mb-1 text-muted small">@${user.username}</p>
                    <p class="mb-0 small">${user.email}</p>
                    ${user.age || user.city ? `
                        <p class="mb-0 small text-muted">
                            ${user.age ? `${user.age} ans` : ''}
                            ${user.age && user.city ? ' • ' : ''}
                            ${user.city || ''}
                        </p>
                    ` : ''}
                </div>
                <div class="quick-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="editUser(${user.id})" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteUser(${user.id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <small class="text-muted">Créé le ${formatDate(user.createdAt)}</small>
        </div>
    `).join('');
    
    usersList.innerHTML = usersHtml;
}

function updateUserSelect(usersData) {
    const select = document.getElementById('messageUserId');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choisir un utilisateur...</option>';
    
    usersData.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.name} (@${user.username})`;
        select.appendChild(option);
    });
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('userName').value.trim(),
        username: document.getElementById('userUsername').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        age: document.getElementById('userAge').value ? parseInt(document.getElementById('userAge').value) : undefined,
        city: document.getElementById('userCity').value.trim() || undefined
    };
    
    // Validation simple côté client
    if (userData.name.length < 1 || userData.name.length > 100) {
        showNotification('Le nom doit contenir entre 1 et 100 caractères', 'error');
        return;
    }
    
    if (userData.username.length < 3 || userData.username.length > 50) {
        showNotification('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères', 'error');
        return;
    }
    
    try {
        await apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        showNotification('Utilisateur créé avec succès !', 'success');
        document.getElementById('userForm').reset();
        loadUsers();
    } catch (error) {
        showNotification(`Erreur lors de la création: ${error.message}`, 'error');
    }
}

async function deleteUser(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    try {
        await apiRequest(`/users/${id}`, { method: 'DELETE' });
        showNotification('Utilisateur supprimé avec succès !', 'success');
        loadUsers();
        loadMessages(); // Recharger les messages car l'utilisateur peut avoir des messages
    } catch (error) {
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
}

async function editUser(id) {
    // Pour l'instant, on affiche juste les infos
    try {
        const user = await apiRequest(`/users/${id}`);
        alert(`Modification de ${user.name}\n\nCette fonctionnalité sera ajoutée prochainement.`);
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}

// GESTION DES TÂCHES

async function loadTasks() {
    const loading = document.getElementById('tasksLoading');
    const tasksList = document.getElementById('tasksList');
    const tasksCount = document.getElementById('tasksCount');
    
    loading.classList.add('show');
    tasksList.innerHTML = '';
    
    try {
        tasks = await apiRequest('/tasks');
        displayTasks(tasks);
        updateStats();
        
        if (tasksCount) {
            tasksCount.textContent = tasks.length;
        }
    } catch (error) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Erreur de chargement</h5>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        loading.classList.remove('show');
    }
}

function displayTasks(tasksData) {
    const tasksList = document.getElementById('tasksList');
    
    if (!tasksData || tasksData.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h5>Aucune tâche</h5>
                <p>Créez votre première tâche pour commencer</p>
            </div>
        `;
        return;
    }
    
    const statusConfig = {
        'pending': { icon: '📋', text: 'En attente', class: 'pending' },
        'in-progress': { icon: '⚡', text: 'En cours', class: 'in-progress' },
        'completed': { icon: '✅', text: 'Terminé', class: 'completed' }
    };
    
    const tasksHtml = tasksData.map(task => {
        const status = statusConfig[task.status] || { icon: '❓', text: task.status, class: 'pending' };
        
        return `
            <div class="task-item ${status.class} fade-in">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-2 fw-bold">
                            <i class="fas fa-tasks me-2"></i>
                            ${task.title || 'Tâche sans titre'}
                        </h6>
                        ${task.description ? `<p class="mb-2 text-muted small">${task.description}</p>` : ''}
                        <span class="status-badge ${status.class}">
                            ${status.icon} ${status.text}
                        </span>
                    </div>
                    <div class="quick-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="editTask(${task.id})" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteTask(${task.id})" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <small class="text-muted">Créé le ${formatDate(task.createdAt)}</small>
            </div>
        `;
    }).join('');
    
    tasksList.innerHTML = tasksHtml;
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim() || undefined,
        status: document.getElementById('taskStatus').value
    };
    
    if (!taskData.title) {
        showNotification('Le titre de la tâche est requis', 'error');
        return;
    }
    
    try {
        await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        
        showNotification('Tâche créée avec succès !', 'success');
        document.getElementById('taskForm').reset();
        loadTasks();
    } catch (error) {
        showNotification(`Erreur lors de la création: ${error.message}`, 'error');
    }
}

async function deleteTask(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    
    try {
        await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
        showNotification('Tâche supprimée avec succès !', 'success');
        loadTasks();
    } catch (error) {
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
}

async function editTask(id) {
    try {
        const task = await apiRequest(`/tasks/${id}`);
        alert(`Modification de "${task.title}"\n\nCette fonctionnalité sera ajoutée prochainement.`);
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}

// GESTION DES MESSAGES

async function loadMessages() {
    const loading = document.getElementById('messagesLoading');
    const messagesList = document.getElementById('messagesList');
    const messagesCount = document.getElementById('messagesCount');
    
    loading.classList.add('show');
    messagesList.innerHTML = '';
    
    try {
        messages = await apiRequest('/messages');
        displayMessages(messages);
        updateStats();
        
        if (messagesCount) {
            messagesCount.textContent = messages.length;
        }
    } catch (error) {
        messagesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Erreur de chargement</h5>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        loading.classList.remove('show');
    }
}

function displayMessages(messagesData) {
    const messagesList = document.getElementById('messagesList');
    
    if (!messagesData || messagesData.length === 0) {
        messagesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h5>Aucun message</h5>
                <p>Envoyez votre premier message</p>
            </div>
        `;
        return;
    }
    
    // Trier les messages par date décroissante
    const sortedMessages = messagesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const messagesHtml = sortedMessages.map(message => {
        const user = users.find(u => u.id === message.userId);
        const userName = user ? user.name : `Utilisateur #${message.userId}`;
        const userUsername = user ? user.username : 'inconnu';
        
        return `
            <div class="message-item fade-in">
                <div class="d-flex align-items-start">
                    <div class="user-avatar me-3" style="width: 40px; height: 40px; font-size: 14px;">
                        ${user ? getInitials(user.name) : '?'}
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="mb-0 fw-bold">${userName}</h6>
                            <small class="text-muted">@${userUsername}</small>
                        </div>
                        <p class="mb-2">${message.content}</p>
                        <small class="text-muted">${formatDate(message.createdAt)}</small>
                    </div>
                    <div class="quick-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="editMessage(${message.id}, ${message.userId})" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteMessage(${message.id}, ${message.userId})" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    messagesList.innerHTML = messagesHtml;
}

async function handleMessageSubmit(e) {
    e.preventDefault();
    
    const messageData = {
        content: document.getElementById('messageContent').value.trim(),
        userId: parseInt(document.getElementById('messageUserId').value)
    };
    
    if (!messageData.content || messageData.content.length < 1) {
        showNotification('Le contenu du message est requis', 'error');
        return;
    }
    
    if (messageData.content.length > 1000) {
        showNotification('Le message ne peut pas dépasser 1000 caractères', 'error');
        return;
    }
    
    if (!messageData.userId) {
        showNotification('Veuillez sélectionner un utilisateur', 'error');
        return;
    }
    
    try {
        await apiRequest('/messages', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
        
        showNotification('Message envoyé avec succès !', 'success');
        document.getElementById('messageForm').reset();
        document.getElementById('messageCounter').textContent = '0';
        loadMessages();
    } catch (error) {
        showNotification(`Erreur lors de l'envoi: ${error.message}`, 'error');
    }
}

async function deleteMessage(id, userId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;
    
    try {
        await apiRequest(`/messages/${id}`, {
            method: 'DELETE',
            headers: {
                'x-user-id': userId.toString()
            }
        });
        
        showNotification('Message supprimé avec succès !', 'success');
        loadMessages();
    } catch (error) {
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
}

async function editMessage(id, userId) {
    try {
        const message = await apiRequest(`/messages/${id}`);
        alert(`Modification du message de ${message.content.substring(0, 50)}...\n\nCette fonctionnalité sera ajoutée prochainement.`);
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}

// ========================================
// GESTION DES STATISTIQUES
// ========================================

function updateStats() {
    // Mettre à jour les compteurs principaux
    const totalUsers = document.getElementById('totalUsers');
    const totalTasks = document.getElementById('totalTasks');
    const totalMessages = document.getElementById('totalMessages');
    
    if (totalUsers) totalUsers.textContent = users.length;
    if (totalTasks) totalTasks.textContent = tasks.length;
    if (totalMessages) totalMessages.textContent = messages.length;
    
    // Mettre à jour l'activité récente
    updateRecentActivity();
}

function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;
    
    const activities = [];
    
    // Ajouter les activités récentes (dernières 24h simulées)
    if (users.length > 0) {
        const recentUsers = users.slice(-3);
        recentUsers.forEach(user => {
            activities.push({
                type: 'user',
                icon: 'fas fa-user-plus text-primary',
                text: `Nouvel utilisateur: ${user.name}`,
                time: formatDate(user.createdAt)
            });
        });
    }
    
    if (tasks.length > 0) {
        const recentTasks = tasks.slice(-3);
        recentTasks.forEach(task => {
            activities.push({
                type: 'task',
                icon: 'fas fa-tasks text-success',
                text: `Nouvelle tâche: ${task.title}`,
                time: formatDate(task.createdAt)
            });
        });
    }
    
    if (messages.length > 0) {
        const recentMessages = messages.slice(-3);
        recentMessages.forEach(message => {
            const user = users.find(u => u.id === message.userId);
            activities.push({
                type: 'message',
                icon: 'fas fa-comment text-info',
                text: `Message de ${user ? user.name : 'Utilisateur inconnu'}`,
                time: formatDate(message.createdAt)
            });
        });
    }
    
    if (activities.length === 0) {
        recentActivity.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h6>Aucune activité récente</h6>
                <p>Les activités apparaîtront ici</p>
            </div>
        `;
        return;
    }
    
    // Trier par date et prendre les 5 plus récents
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = activities.slice(0, 5);
    
    const activitiesHtml = recentActivities.map(activity => `
        <div class="d-flex align-items-center mb-3">
            <div class="me-3">
                <i class="${activity.icon}"></i>
            </div>
            <div class="flex-grow-1">
                <p class="mb-0">${activity.text}</p>
                <small class="text-muted">${activity.time}</small>
            </div>
        </div>
    `).join('');
    
    recentActivity.innerHTML = activitiesHtml;
}

// GESTION DES ONGLETS

function handleTabChange(event) {
    const targetId = event.target.getAttribute('href');
    
    switch (targetId) {
        case '#users-tab':
            if (users.length === 0) loadUsers();
            break;
        case '#tasks-tab':
            if (tasks.length === 0) loadTasks();
            break;
        case '#messages-tab':
            if (messages.length === 0) loadMessages();
            break;
        case '#stats-tab':
            updateStats();
            break;
    }
}
// CHARGEMENT INITIAL
async function loadAllData() {
    try {
        await testConnection();
        await loadUsers();
        // Les autres données se chargeront au clic sur leurs onglets respectifs
    } catch (error) {
        console.error('Erreur lors du chargement initial:', error);
    }
}
