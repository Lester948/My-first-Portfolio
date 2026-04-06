// function sendMessage(e) {
//   e.preventDefault();
//   alert("Message sent!");
// }

document.addEventListener('DOMContentLoaded', function() {
  // Hamburger menu toggle
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', function() {
      nav.classList.toggle('active');
    });

    // Close menu when a link is clicked
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', function() {
        nav.classList.remove('active');
      });
    });
  }
});