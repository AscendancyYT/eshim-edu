const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
};

if (typeof firebase === "undefined") {
  console.error("Firebase SDK not loaded. Check CDN scripts in HTML.");
  alert(
    "Error: Firebase SDK failed to load. Please check your internet connection or CDN URLs."
  );
} else {
  firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();

  const emailInput = document.querySelector(".emailInput");
  const passwordInput = document.querySelector(".passwordInput");
  const form = document.querySelector(".login-form");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const emailValue = emailInput.value;
    const passwordValue = passwordInput.value;

    auth
      .signInWithEmailAndPassword(emailValue, passwordValue)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log("User signed in with ID: ", user.uid);
        alert("Login successful! Welcome, " + user.email);
        form.reset();
      })
      .catch((error) => {
        console.error("Error during login: ", error.message);
        alert("Error: " + error.message);
      });
  });
}
