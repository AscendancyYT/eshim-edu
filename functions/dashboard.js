const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

function showCustomAlert(message, type) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `custom-alert ${type}`;
  alertDiv.textContent = message;
  document.body.prepend(alertDiv);

  setTimeout(() => {
    alertDiv.classList.add("show");
  }, 100);

  setTimeout(() => {
    alertDiv.classList.remove("show");
    setTimeout(() => {
      alertDiv.remove();
    }, 500);
  }, 1500);
}

auth.onAuthStateChanged((user) => {
  if (user) {
    db.collection("users").doc(user.uid).get()
      .then((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          document.getElementById("user-name").textContent = userData.name;
          renderDashboard(userData);
        } else {
          showCustomAlert("User data not found", "error");
        }
      })
      .catch((error) => {
        showCustomAlert(`Error fetching user data: ${error.message}`, "error");
      });
  } else {
    window.location.href = "../src/login.html";
  }
});

function renderDashboard(userData) {
  const mainContent = document.querySelector(".main-content");
  const resourcesLink = document.getElementById("resources-link");
  const userManagementLink = document.getElementById("user-management-link");

  if (userData.status === "Admin") {
    resourcesLink.style.display = "none";
    userManagementLink.style.display = "block";
    mainContent.innerHTML = getAdminHomeView();
  } else {
    resourcesLink.style.display = "block";
    userManagementLink.style.display = "none";
    mainContent.innerHTML = getStudentHomeView(userData);
  }

  setupNavigation(userData);
}

function getStudentHomeView(userData) {
  return `
    <h2>Welcome, ${userData.name}!</h2>
    <div class="profile-card">
      <h3>Profile Information</h3>
      <p><strong>Name:</strong> ${userData.name}</p>
      <p><strong>Class:</strong> ${userData.class}</p>
      <p><strong>Balance:</strong> ${userData.balance}</p>
    </div>
    <div class="quick-links">
      <h3>Quick Links</h3>
      <a href="#" data-view="resources">View Resources</a>
    </div>
  `;
}

function getAdminHomeView() {
  return `
    <h2>Admin Dashboard</h2>
    <p>Welcome, Admin! Here you can manage users and view system statistics.</p>
    <a href="#" data-view="user-management">Manage Users</a>
  `;
}

function setupNavigation(userData) {
  const navLinks = document.querySelectorAll(".sidebar a[data-view]");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = e.target.getAttribute("data-view");
      switchView(view, userData);
    });
  });

  document.getElementById("logout").addEventListener("click", () => {
    auth.signOut().then(() => {
      showCustomAlert("Logged out successfully", "success");
      setTimeout(() => {
        window.location.href = "../src/login.html";
      }, 1500);
    }).catch((error) => {
      showCustomAlert(`Error logging out: ${error.message}`, "error");
    });
  });
}

function switchView(view, userData) {
  const mainContent = document.querySelector(".main-content");
  switch (view) {
    case "home":
      mainContent.innerHTML = userData.status === "Admin" ? getAdminHomeView() : getStudentHomeView(userData);
      break;
    case "profile":
      mainContent.innerHTML = getProfileView(userData);
      break;
    case "resources":
      if (userData.status !== "Admin") {
        mainContent.innerHTML = getResourcesView();
      }
      break;
    case "user-management":
      if (userData.status === "Admin") {
        fetchAllUsers().then((users) => {
          mainContent.innerHTML = getUserManagementView(users);
          setupEditListeners(users);
        }).catch((error) => {
          showCustomAlert(`Error fetching users: ${error.message}`, "error");
        });
      }
      break;
    case "settings":
      mainContent.innerHTML = getSettingsView();
      break;
    default:
      mainContent.innerHTML = "<h2>Page Not Found</h2>";
  }
}

function getProfileView(userData) {
  return `
    <h2>Profile</h2>
    <div class="profile-card">
      <p><strong>Name:</strong> ${userData.name}</p>
      <p><strong>Email:</strong> ${userData.email}</p>
      <p><strong>Class:</strong> ${userData.class}</p>
      <p><strong>Balance:</strong> ${userData.balance}</p>
      <p><strong>Status:</strong> ${userData.status}</p>
    </div>
  `;
}

function getResourcesView() {
  return `
    <h2>Resources</h2>
    <p>Here you can find educational materials and assignments.</p>
    <ul>
      <li><a href="#">Math Resources</a></li>
      <li><a href="#">Science Resources</a></li>
      <li><a href="#">History Resources</a></li>
    </ul>
  `;
}

function fetchAllUsers() {
  return db.collection("users").get().then((querySnapshot) => {
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  });
}

function getUserManagementView(users) {
  let tableHtml = `
    <h2>User Management</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Class</th>
          <th>Balance</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;
  users.forEach((user) => {
    tableHtml += `
      <tr data-user-id="${user.id}">
        <td class="display-name">${user.name}</td>
        <td class="display-email">${user.email}</td>
        <td class="display-class">${user.class}</td>
        <td class="display-balance">${user.balance}</td>
        <td class="display-status">${user.status}</td>
        <td><button class="edit-btn">Edit</button></td>
      </tr>
      <tr class="edit-row" style="display: none;">
        <td colspan="6">
          <form class="edit-user-form">
            <div class="form-group">
              <label>Name:</label>
              <input type="text" name="name" value="${user.name}" required>
            </div>
            <div class="form-group">
              <label>Email:</label>
              <input type="email" name="email" value="${user.email}" required>
            </div>
            <div class="form-group">
              <label>Class:</label>
              <select name="class" required>
                ${generateClassOptions(user.class)}
              </select>
            </div>
            <div class="form-group">
              <label>Balance:</label>
              <input type="number" name="balance" value="${user.balance}" required>
            </div>
            <div class="form-group">
              <label>Status:</label>
              <select name="status" required>
                <option value="User" ${user.status === "User" ? "selected" : ""}>User</option>
                <option value="Admin" ${user.status === "Admin" ? "selected" : ""}>Admin</option>
              </select>
            </div>
            <button type="submit" class="save-btn">Save</button>
            <button type="button" class="cancel-btn">Cancel</button>
          </form>
        </td>
      </tr>
    `;
  });
  tableHtml += `
      </tbody>
    </table>
  `;
  return tableHtml;
}

function generateClassOptions(selectedClass) {
  const classes = [
    "1-A", "1-B", "1-D", "1-V", "1-G",
    "2-A", "2-B", "2-D", "2-V", "2-G",
    "3-A", "3-B", "3-D", "3-V", "3-G",
    "4-A", "4-B", "4-D", "4-V", "4-G",
    "5-A", "5-B", "5-D", "5-V", "5-G",
    "6-A", "6-B", "6-D", "6-V", "6-G",
    "7-A", "7-B", "7-D", "7-V", "7-G",
    "8-A", "8-B", "8-D", "8-V", "8-G",
    "9-A", "9-B", "9-D", "9-V", "9-G",
    "10-A", "10-B", "10-D", "10-V", "10-G",
    "11-A", "11-B", "11-D", "11-V", "11-G"
  ];
  return classes.map(cls => `<option value="${cls}" ${cls === selectedClass ? "selected" : ""}>${cls}</option>`).join("");
}

function setupEditListeners(users) {
  const editButtons = document.querySelectorAll(".edit-btn");
  editButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const userId = row.dataset.userId;
      const editRow = row.nextElementSibling;
      row.style.display = "none";
      editRow.style.display = "table-row";

      const form = editRow.querySelector(".edit-user-form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const updatedData = {
          name: formData.get("name"),
          email: formData.get("email"),
          class: formData.get("class"),
          balance: parseFloat(formData.get("balance")),
          status: formData.get("status"),
        };

        db.collection("users").doc(userId).update(updatedData)
          .then(() => {
            showCustomAlert("User updated successfully", "success");
            row.querySelector(".display-name").textContent = updatedData.name;
            row.querySelector(".display-email").textContent = updatedData.email;
            row.querySelector(".display-class").textContent = updatedData.class;
            row.querySelector(".display-balance").textContent = updatedData.balance;
            row.querySelector(".display-status").textContent = updatedData.status;
            row.style.display = "table-row";
            editRow.style.display = "none";
          })
          .catch((error) => {
            showCustomAlert(`Error updating user: ${error.message}`, "error");
          });
      });

      const cancelButton = editRow.querySelector(".cancel-btn");
      cancelButton.addEventListener("click", () => {
        row.style.display = "table-row";
        editRow.style.display = "none";
      });
    });
  });
}

function getSettingsView() {
  return `
    <h2>Settings</h2>
    <p>Here you can adjust your account settings.</p>
    <form>
      <label for="theme">Theme:</label>
      <select id="theme">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <button type="submit">Save</button>
    </form>
  `;
}