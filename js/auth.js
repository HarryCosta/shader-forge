// js/auth.js

const AppBackend = {
    // 1. MOCK AUTHENTICATION
    login: function(username) {
        // Simulates a Google Login by generating a fake User ID
        const fakeUser = {
            name: username,
            uid: "user_" + Math.random().toString(36).substr(2, 9)
        };
        localStorage.setItem('shaderforge_user', JSON.stringify(fakeUser));
        window.location.reload();
    },

    logout: function() {
        localStorage.removeItem('shaderforge_user');
        window.location.reload();
    },

    getCurrentUser: function() {
        return JSON.parse(localStorage.getItem('shaderforge_user'));
    },

    // 2. MOCK DATABASE (Ready to be swapped for Firebase Firestore later)
    saveProject: function(projectData) {
        const user = this.getCurrentUser();
        if (!user) return false;

        // Tag the project with the specific User's ID
        projectData.ownerId = user.uid; 

        let allProjects = JSON.parse(localStorage.getItem('cartagraphia_db') || '[]');
        
        // Overwrite if it exists, otherwise add new
        const existingIndex = allProjects.findIndex(p => p.name === projectData.name && p.ownerId === user.uid);
        if (existingIndex >= 0) {
            allProjects[existingIndex] = projectData;
        } else {
            allProjects.push(projectData);
        }

        localStorage.setItem('cartagraphia_db', JSON.stringify(allProjects));
        return true;
    },

    getUserProjects: function() {
        const user = this.getCurrentUser();
        if (!user) return [];

        let allProjects = JSON.parse(localStorage.getItem('cartagraphia_db') || '[]');
        // Only return projects that belong to the logged-in user!
        return allProjects.filter(p => p.ownerId === user.uid); 
    },
    
    deleteProject: function(projectName) {
        const user = this.getCurrentUser();
        if (!user) return;
        
        let allProjects = JSON.parse(localStorage.getItem('cartagraphia_db') || '[]');
        allProjects = allProjects.filter(p => !(p.name === projectName && p.ownerId === user.uid));
        localStorage.setItem('cartagraphia_db', JSON.stringify(allProjects));
    }
};

// AUTO-UI UPDATER: This runs on every page load to swap the Login/Logout buttons
document.addEventListener('DOMContentLoaded', () => {
    const user = AppBackend.getCurrentUser();
    const authContainer = document.querySelector('.auth-buttons'); // Looks for the div in index.html

    if (authContainer) {
        if (user) {
            // User is logged in
            authContainer.innerHTML = `
                <span style="color: #8b949e; margin-right: 15px; font-size: 14px;">Welcome, ${user.name}</span>
                <button id="btn-logout" class="btn-outline" style="border-color: #f85149; color: #f85149;">Log Out</button>
            `;
            document.getElementById('btn-logout').addEventListener('click', AppBackend.logout);
        } else {
            // User is logged out
            authContainer.innerHTML = `<button id="btn-login" class="btn-outline">Log In (Test Mode)</button>`;
            document.getElementById('btn-login').addEventListener('click', () => {
                const name = prompt("MOCK LOGIN:\nEnter a test username. Maps saved under this name will be kept separate from other users!");
                if (name) AppBackend.login(name);
            });
        }
    }
});